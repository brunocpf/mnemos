import Dexie from "dexie";

import { db } from "@/client-data/db";
import type { EmbeddingJob } from "@/client-data/embedding-job";

export const EMBEDDING_QUEUE_BATCH_SIZE = 4;
export const EMBEDDING_JOB_MAX_ATTEMPTS = 5;
const DEFAULT_RETRY_BASE_DELAY_MS = 2_000;
const RETRY_MAX_DELAY_MS = 60_000;

const LOG_PREFIX = "[embedding-queue]";

export type EmbedBatchItem = { chunkId: string; text: string };
export type EmbedBatchResult = { chunkId: string; vectorBuffer: ArrayBuffer };
/** Embeds a small batch; must resolve with one vector per item or throw. */
export type EmbedBatchFn = (
  items: EmbedBatchItem[],
) => Promise<EmbedBatchResult[]>;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Marks a note as fully embedded once every live chunk has a vector for the
 * model and no job is still outstanding. Must run inside a transaction that
 * covers chunks, embeddings, embeddingJobs and noteHashes.
 */
async function finalizeNoteIfComplete(noteId: string, modelId: string) {
  const jobs = await db.embeddingJobs
    .where("noteId")
    .equals(noteId)
    .filter((j) => j.modelId === modelId)
    .toArray();
  if (jobs.some((j) => j.status !== "done")) return false;

  const prev = await db.noteHashes.get(noteId);
  const indexedHash = prev?.lastIndexedHash;
  if (!indexedHash) return false;
  // Done jobs from an older hash mean a newer index is waiting to be enqueued.
  if (jobs.some((j) => j.contentHash !== indexedHash)) return false;

  const chunkIds = await db.chunks.where("noteId").equals(noteId).primaryKeys();
  const have = await db.embeddings.bulkGet(
    chunkIds.map((id) => [id, modelId] as [string, string]),
  );
  if (have.some((e) => !e)) return false;

  await db.noteHashes.put({
    ...prev,
    noteId,
    lastEmbeddedHash: indexedHash,
    lastEmbeddingModelId: modelId,
    embeddedAt: new Date(),
  });
  if (jobs.length) {
    await db.embeddingJobs.bulkDelete(jobs.map((j) => j.id));
  }
  return true;
}

/**
 * Reconciles a note's jobs with its current chunks, after the chunk diff:
 * jobs for chunks that no longer exist are discarded (stale), chunks without a
 * vector get exactly one job per (chunkId, modelId), and a note that needs no
 * work is marked embedded right away.
 */
export async function enqueueNoteJobs(args: {
  noteId: string;
  modelId: string;
  contentHash: string;
  chunks: { id: string; text: string }[];
}) {
  const { noteId, modelId, contentHash, chunks } = args;
  return await db.transaction(
    "rw",
    db.notes,
    db.chunks,
    db.embeddings,
    db.embeddingJobs,
    db.noteHashes,
    async () => {
      const result = { enqueued: 0, discarded: 0, finalized: false };

      const note = await db.notes.get(noteId);
      if (!note || note.deleted) return result;
      const hash = await db.noteHashes.get(noteId);
      // A newer content hash was indexed meanwhile: this call is stale.
      if (hash?.lastIndexedHash && hash.lastIndexedHash !== contentHash) {
        return result;
      }

      const wanted = new Set(chunks.map((c) => c.id));
      const existing = await db.embeddingJobs
        .where("noteId")
        .equals(noteId)
        .toArray();
      const byKey = new Map<string, EmbeddingJob>();
      const stale: string[] = [];
      for (const job of existing) {
        if (job.modelId === modelId && wanted.has(job.chunkId)) {
          byKey.set(job.chunkId, job);
        } else {
          stale.push(job.id);
        }
      }
      if (stale.length) await db.embeddingJobs.bulkDelete(stale);
      result.discarded = stale.length;

      const vectors = await db.embeddings.bulkGet(
        chunks.map((c) => [c.id, modelId] as [string, string]),
      );
      const now = new Date();
      const toAdd: EmbeddingJob[] = [];
      const toUpdate: EmbeddingJob[] = [];
      const obsolete: string[] = [];
      chunks.forEach((chunk, i) => {
        const job = byKey.get(chunk.id);
        if (vectors[i]) {
          // Already embedded: a leftover pending job would be redundant.
          if (job && job.status !== "done") obsolete.push(job.id);
          else if (job) toUpdate.push({ ...job, contentHash });
          return;
        }
        if (!job) {
          toAdd.push({
            id: crypto.randomUUID(),
            noteId,
            chunkId: chunk.id,
            modelId,
            contentHash,
            text: chunk.text,
            status: "pending",
            createdAt: now,
            attempts: 0,
          });
        } else if (job.status === "failed" || job.status === "done") {
          // A new edit gives failed jobs a fresh chance; a done job without a
          // vector is inconsistent, so redo it.
          toUpdate.push({
            ...job,
            contentHash,
            status: "pending",
            attempts: 0,
            lastError: undefined,
          });
        } else {
          toUpdate.push({ ...job, contentHash });
        }
      });
      if (obsolete.length) await db.embeddingJobs.bulkDelete(obsolete);
      if (toAdd.length) await db.embeddingJobs.bulkAdd(toAdd);
      if (toUpdate.length) await db.embeddingJobs.bulkPut(toUpdate);
      result.enqueued = toAdd.length;

      result.finalized = await finalizeNoteIfComplete(noteId, modelId);
      return result;
    },
  );
}

/** Atomically takes up to `limit` pending jobs and marks them in progress. */
export async function claimPendingJobs(modelId: string, limit: number) {
  return await db.transaction("rw", db.embeddingJobs, async () => {
    const jobs = await db.embeddingJobs
      .where("[status+createdAt]")
      .between(["pending", Dexie.minKey], ["pending", Dexie.maxKey])
      .filter((j) => j.modelId === modelId)
      .limit(limit)
      .toArray();
    const claimed = jobs.map((j) => ({
      ...j,
      status: "in_progress" as const,
    }));
    if (claimed.length) await db.embeddingJobs.bulkPut(claimed);
    return claimed;
  });
}

/**
 * Persists a batch's vectors and marks their jobs done in one transaction.
 * Jobs discarded or superseded while embedding are ignored, so a late batch
 * can never write a vector for a chunk that is no longer wanted.
 */
export async function completeJobs(
  jobs: EmbeddingJob[],
  vectors: EmbedBatchResult[],
) {
  const byChunk = new Map(vectors.map((v) => [v.chunkId, v.vectorBuffer]));
  return await db.transaction(
    "rw",
    db.notes,
    db.chunks,
    db.embeddings,
    db.embeddingJobs,
    db.noteHashes,
    async () => {
      const summary = { persisted: 0, skipped: 0, notesCompleted: 0 };
      const touched = new Map<string, string>();
      for (const claimed of jobs) {
        const job = await db.embeddingJobs.get(claimed.id);
        const vector = byChunk.get(claimed.chunkId);
        if (!job || job.status !== "in_progress" || !vector) {
          summary.skipped++;
          continue;
        }
        const [note, chunk] = await Promise.all([
          db.notes.get(job.noteId),
          db.chunks.get(job.chunkId),
        ]);
        if (!note || note.deleted || !chunk) {
          await db.embeddingJobs.delete(job.id);
          summary.skipped++;
          continue;
        }
        await db.embeddings.put({
          chunkId: job.chunkId,
          noteId: job.noteId,
          modelId: job.modelId,
          vectorBuffer: vector,
        });
        await db.embeddingJobs.put({
          ...job,
          status: "done",
          lastError: undefined,
        });
        touched.set(job.noteId, job.modelId);
        summary.persisted++;
      }
      for (const [noteId, modelId] of touched) {
        if (await finalizeNoteIfComplete(noteId, modelId)) {
          summary.notesCompleted++;
        }
      }
      return summary;
    },
  );
}

/** Returns a failed batch's jobs to the queue, or parks them after too many tries. */
export async function failJobs(jobs: EmbeddingJob[], error: unknown) {
  const message = errorMessage(error);
  return await db.transaction("rw", db.embeddingJobs, async () => {
    let parked = 0;
    for (const claimed of jobs) {
      const job = await db.embeddingJobs.get(claimed.id);
      if (!job || job.status !== "in_progress") continue;
      const attempts = job.attempts + 1;
      const failed = attempts >= EMBEDDING_JOB_MAX_ATTEMPTS;
      if (failed) parked++;
      await db.embeddingJobs.put({
        ...job,
        attempts,
        lastError: message,
        status: failed ? "failed" : "pending",
      });
    }
    return parked;
  });
}

/**
 * Startup recovery: jobs left in progress by an interrupted session go back to
 * pending, and parked (failed) jobs get another chance.
 */
export async function recoverInterruptedJobs() {
  return await db.transaction("rw", db.embeddingJobs, async () => {
    const range = (status: string) =>
      db.embeddingJobs
        .where("[status+createdAt]")
        .between([status, Dexie.minKey], [status, Dexie.maxKey]);
    const interrupted = await range("in_progress").toArray();
    const failed = await range("failed").toArray();
    const reset = [...interrupted, ...failed].map((j) => ({
      ...j,
      status: "pending" as const,
      attempts: 0,
    }));
    if (reset.length) await db.embeddingJobs.bulkPut(reset);
    return { interrupted: interrupted.length, failed: failed.length };
  });
}

export async function getEmbeddingQueueStats() {
  const stats = { pending: 0, in_progress: 0, done: 0, failed: 0 };
  await db.embeddingJobs.each((j) => {
    stats[j.status]++;
  });
  return stats;
}

/**
 * App-scoped queue runner. It lives outside React (one singleton), reads its
 * work from IndexedDB and so survives route changes, reloads and a terminated
 * worker: whatever was in flight is simply picked up again by `start()`.
 */
export class EmbeddingQueueService {
  private modelId?: string;
  private embed?: EmbedBatchFn;
  private draining = false;
  private rerun = false;
  private degraded = false;
  private failureStreak = 0;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private idleWaiters: (() => void)[] = [];

  constructor(private readonly options: { retryBaseDelayMs?: number } = {}) {}

  /** Sets (or swaps) the embedder and resumes unfinished work. */
  async start(config: { modelId: string; embed: EmbedBatchFn }) {
    this.modelId = config.modelId;
    this.embed = config.embed;
    this.failureStreak = 0;
    this.degraded = false;
    try {
      const recovered = await recoverInterruptedJobs();
      const stats = await getEmbeddingQueueStats();
      console.info(LOG_PREFIX, "start", { recovered, ...stats });
    } catch (error) {
      console.error(LOG_PREFIX, "recovery failed", error);
    }
    this.kick();
  }

  /** Stops processing; queued jobs stay in IndexedDB for the next start(). */
  stop() {
    this.embed = undefined;
    this.modelId = undefined;
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
  }

  /** Adds jobs for a note's added/changed chunks (see enqueueNoteJobs). */
  async enqueueNote(args: Parameters<typeof enqueueNoteJobs>[0]) {
    const result = await enqueueNoteJobs(args);
    console.info(LOG_PREFIX, "enqueue", { noteId: args.noteId, ...result });
    if (result.enqueued) this.kick();
    return result;
  }

  /** Starts draining unless a drain is already running. */
  kick() {
    if (!this.embed) return;
    if (this.draining) {
      this.rerun = true;
      return;
    }
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    void this.drain();
  }

  /** Resolves when no drain is running and no retry is scheduled (tests). */
  whenIdle() {
    if (!this.draining && !this.retryTimer) return Promise.resolve();
    return new Promise<void>((resolve) => this.idleWaiters.push(resolve));
  }

  private async drain() {
    this.draining = true;
    try {
      do {
        this.rerun = false;
        await this.processUntilEmpty();
      } while (this.rerun && this.embed);
    } catch (error) {
      console.error(LOG_PREFIX, "drain crashed", error);
    } finally {
      this.draining = false;
      if (!this.retryTimer) this.flushIdle();
    }
  }

  private flushIdle() {
    const waiters = this.idleWaiters;
    this.idleWaiters = [];
    waiters.forEach((resolve) => resolve());
  }

  private async processUntilEmpty() {
    while (this.embed && this.modelId) {
      const embed = this.embed;
      const limit = this.degraded ? 1 : EMBEDDING_QUEUE_BATCH_SIZE;
      const jobs = await claimPendingJobs(this.modelId, limit);
      if (!jobs.length) return;

      try {
        const vectors = await embed(
          jobs.map((j) => ({ chunkId: j.chunkId, text: j.text })),
        );
        const summary = await completeJobs(jobs, vectors);
        this.failureStreak = 0;
        this.degraded = false;
        console.info(LOG_PREFIX, "batch done", summary);
      } catch (error) {
        const parked = await failJobs(jobs, error);
        this.failureStreak++;
        // One bad chunk must not keep failing its neighbours.
        this.degraded = true;
        console.error(LOG_PREFIX, "batch failed", {
          error: errorMessage(error),
          size: jobs.length,
          parked,
          streak: this.failureStreak,
        });
        this.scheduleRetry();
        return;
      }
    }
  }

  private scheduleRetry() {
    const base = this.options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
    const delay = Math.min(
      base * 2 ** (this.failureStreak - 1),
      RETRY_MAX_DELAY_MS,
    );
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      this.kick();
      if (!this.draining) this.flushIdle();
    }, delay);
  }
}

export const embeddingQueue = new EmbeddingQueueService();
