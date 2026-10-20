import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/client-data/db";
import {
  claimPendingJobs,
  completeJobs,
  EMBEDDING_JOB_MAX_ATTEMPTS,
  EMBEDDING_QUEUE_BATCH_SIZE,
  type EmbedBatchFn,
  EmbeddingQueueService,
  enqueueNoteJobs,
  failJobs,
  recoverInterruptedJobs,
} from "@/client-data/embedding-queue";
import { createNote, deleteNote } from "@/client-data/notes-dal";

const MODEL = "model-a";
const vec = (...n: number[]) => new Float32Array(n).buffer;

/** Seeds a note whose chunk diff has already run (chunks + lastIndexedHash). */
async function seedNote(texts: string[], contentHash = "h1") {
  const noteId = await createNote({ content: texts.join("\n") });
  const chunks = texts.map((text, order) => ({
    id: `${noteId}:${text}`,
    noteId,
    order,
    text,
    hash: text,
  }));
  await db.chunks.bulkPut(chunks);
  const prev = await db.noteHashes.get(noteId);
  await db.noteHashes.put({
    ...prev,
    noteId,
    lastIndexedHash: contentHash,
  });
  return { noteId, chunks, contentHash };
}

const enqueue = (note: Awaited<ReturnType<typeof seedNote>>, modelId = MODEL) =>
  enqueueNoteJobs({
    noteId: note.noteId,
    modelId,
    contentHash: note.contentHash,
    chunks: note.chunks,
  });

const okEmbed: EmbedBatchFn = async (items) =>
  items.map((i) => ({ chunkId: i.chunkId, vectorBuffer: vec(1, 2) }));

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("enqueueNoteJobs", () => {
  it("creates one pending job per chunk without a vector", async () => {
    const note = await seedNote(["a", "b", "c"]);
    await db.embeddings.put({
      chunkId: note.chunks[0].id,
      noteId: note.noteId,
      modelId: MODEL,
      vectorBuffer: vec(1),
    });

    const res = await enqueue(note);
    expect(res.enqueued).toBe(2);
    const jobs = await db.embeddingJobs.toArray();
    expect(jobs.map((j) => j.chunkId).sort()).toEqual(
      [note.chunks[1].id, note.chunks[2].id].sort(),
    );
    expect(jobs.every((j) => j.status === "pending")).toBe(true);
    expect(jobs[0]).toMatchObject({
      noteId: note.noteId,
      modelId: MODEL,
      contentHash: "h1",
    });
  });

  it("does not duplicate jobs for the same (chunkId, modelId)", async () => {
    const note = await seedNote(["a", "b"]);
    await enqueue(note);
    const again = await enqueue(note);
    expect(again.enqueued).toBe(0);
    expect(await db.embeddingJobs.count()).toBe(2);

    // The unique (chunkId, modelId) index backs the dedupe up.
    const [job] = await db.embeddingJobs.toArray();
    await expect(
      db.embeddingJobs.add({ ...job, id: crypto.randomUUID() }),
    ).rejects.toThrow();
  });

  it("discards jobs of another model when the active model changes", async () => {
    const note = await seedNote(["a", "b"]);
    await enqueue(note);
    const res = await enqueue(note, "model-b");
    expect(res).toMatchObject({ discarded: 2, enqueued: 2 });
    const jobs = await db.embeddingJobs.toArray();
    expect(jobs.every((j) => j.modelId === "model-b")).toBe(true);
  });

  it("marks a note with nothing to embed as embedded right away", async () => {
    const note = await seedNote(["a"]);
    await db.embeddings.put({
      chunkId: note.chunks[0].id,
      noteId: note.noteId,
      modelId: MODEL,
      vectorBuffer: vec(1),
    });
    const res = await enqueue(note);
    expect(res.finalized).toBe(true);
    const hash = await db.noteHashes.get(note.noteId);
    expect(hash).toMatchObject({
      lastIndexedHash: "h1",
      lastEmbeddedHash: "h1",
      lastEmbeddingModelId: MODEL,
    });
  });

  it("discards jobs for chunks removed by a newer edit and retargets the rest", async () => {
    const v1 = await seedNote(["keep", "old"], "h1");
    await enqueue(v1);

    const keepId = v1.chunks[0].id;
    const v2 = {
      noteId: v1.noteId,
      contentHash: "h2",
      chunks: [
        v1.chunks[0],
        {
          id: `${v1.noteId}:new`,
          noteId: v1.noteId,
          order: 1,
          text: "new",
          hash: "new",
        },
      ],
    };
    await db.chunks.clear();
    await db.chunks.bulkPut(v2.chunks);
    await db.noteHashes.update(v1.noteId, { lastIndexedHash: "h2" });
    const res = await enqueue(v2);

    expect(res.discarded).toBe(1);
    const jobs = await db.embeddingJobs.toArray();
    expect(jobs.map((j) => j.chunkId).sort()).toEqual(
      [keepId, `${v1.noteId}:new`].sort(),
    );
    expect(jobs.every((j) => j.contentHash === "h2")).toBe(true);
  });

  it("ignores a stale call when a newer hash was already indexed", async () => {
    const note = await seedNote(["a"], "h2");
    const res = await enqueueNoteJobs({
      noteId: note.noteId,
      modelId: MODEL,
      contentHash: "h1",
      chunks: note.chunks,
    });
    expect(res.enqueued).toBe(0);
    expect(await db.embeddingJobs.count()).toBe(0);
  });

  it("ignores deleted notes", async () => {
    const note = await seedNote(["a"]);
    await deleteNote(note.noteId);
    const res = await enqueue(note);
    expect(res.enqueued).toBe(0);
    expect(await db.embeddingJobs.count()).toBe(0);
  });

  it("gives failed jobs a fresh chance on re-enqueue", async () => {
    const note = await seedNote(["a"]);
    await enqueue(note);
    await db.embeddingJobs.toCollection().modify({
      status: "failed",
      attempts: EMBEDDING_JOB_MAX_ATTEMPTS,
    });
    await enqueue(note);
    const [job] = await db.embeddingJobs.toArray();
    expect(job).toMatchObject({ status: "pending", attempts: 0 });
  });
});

describe("job lifecycle", () => {
  it("claims a bounded batch and marks it in progress", async () => {
    const note = await seedNote(["a", "b", "c", "d", "e", "f"]);
    await enqueue(note);
    const claimed = await claimPendingJobs(MODEL, EMBEDDING_QUEUE_BATCH_SIZE);
    expect(claimed).toHaveLength(EMBEDDING_QUEUE_BATCH_SIZE);
    expect(claimed.every((j) => j.status === "in_progress")).toBe(true);
    expect(
      await db.embeddingJobs.where("status").equals("pending").count(),
    ).toBe(2);
    // Claimed jobs are not handed out twice.
    const next = await claimPendingJobs(MODEL, 10);
    expect(next).toHaveLength(2);
  });

  it("persists vectors incrementally and finalizes the note only when all jobs are done", async () => {
    const note = await seedNote(["a", "b", "c"]);
    await enqueue(note);

    const first = await claimPendingJobs(MODEL, 2);
    const s1 = await completeJobs(first, await okEmbed(first));
    expect(s1).toMatchObject({ persisted: 2, notesCompleted: 0 });
    expect(await db.embeddings.count()).toBe(2);
    expect((await db.noteHashes.get(note.noteId))?.lastEmbeddedHash).toBe(
      undefined,
    );

    const rest = await claimPendingJobs(MODEL, 2);
    const s2 = await completeJobs(rest, await okEmbed(rest));
    expect(s2).toMatchObject({ persisted: 1, notesCompleted: 1 });
    expect(await db.noteHashes.get(note.noteId)).toMatchObject({
      lastIndexedHash: "h1",
      lastEmbeddedHash: "h1",
      lastEmbeddingModelId: MODEL,
    });
    expect(await db.embeddingJobs.count()).toBe(0);
  });

  it("drops results for jobs discarded while embedding (latest wins)", async () => {
    const note = await seedNote(["a"]);
    await enqueue(note);
    const claimed = await claimPendingJobs(MODEL, 4);

    // The note is edited while the batch is in flight: chunk "a" is gone.
    await db.chunks.clear();
    await db.noteHashes.update(note.noteId, { lastIndexedHash: "h2" });
    const edited = {
      noteId: note.noteId,
      contentHash: "h2",
      chunks: [
        {
          id: `${note.noteId}:b`,
          noteId: note.noteId,
          order: 0,
          text: "b",
          hash: "b",
        },
      ],
    };
    await db.chunks.bulkPut(edited.chunks);
    await enqueueNoteJobs({ ...edited, modelId: MODEL });

    const summary = await completeJobs(claimed, await okEmbed(claimed));
    expect(summary.persisted).toBe(0);
    expect(await db.embeddings.get([note.chunks[0].id, MODEL])).toBeUndefined();
    expect(
      (await db.noteHashes.get(note.noteId))?.lastEmbeddedHash,
    ).toBeUndefined();
  });

  it("does not write vectors for notes deleted mid-embed", async () => {
    const note = await seedNote(["a"]);
    await enqueue(note);
    const claimed = await claimPendingJobs(MODEL, 4);
    await deleteNote(note.noteId);

    const summary = await completeJobs(claimed, await okEmbed(claimed));
    expect(summary.persisted).toBe(0);
    expect(await db.embeddings.count()).toBe(0);
    expect(await db.embeddingJobs.count()).toBe(0);
    expect(await db.noteHashes.count()).toBe(0);
  });

  it("returns failed jobs to pending, then parks them after too many attempts", async () => {
    const note = await seedNote(["a"]);
    await enqueue(note);

    for (let i = 1; i < EMBEDDING_JOB_MAX_ATTEMPTS; i++) {
      const jobs = await claimPendingJobs(MODEL, 4);
      expect(await failJobs(jobs, new Error("boom"))).toBe(0);
      expect((await db.embeddingJobs.toArray())[0]).toMatchObject({
        status: "pending",
        attempts: i,
        lastError: "boom",
      });
    }
    const jobs = await claimPendingJobs(MODEL, 4);
    expect(await failJobs(jobs, new Error("boom"))).toBe(1);
    expect((await db.embeddingJobs.toArray())[0].status).toBe("failed");
    expect(await claimPendingJobs(MODEL, 4)).toHaveLength(0);
  });

  it("recovers interrupted and failed jobs on startup", async () => {
    const note = await seedNote(["a", "b", "c"]);
    await enqueue(note);
    const [a, b] = await db.embeddingJobs.toArray();
    await db.embeddingJobs.update(a.id, { status: "in_progress" });
    await db.embeddingJobs.update(b.id, { status: "failed", attempts: 5 });

    expect(await recoverInterruptedJobs()).toEqual({
      interrupted: 1,
      failed: 1,
    });
    const jobs = await db.embeddingJobs.toArray();
    expect(jobs.every((j) => j.status === "pending" && j.attempts === 0)).toBe(
      true,
    );
  });
});

describe("EmbeddingQueueService", () => {
  it("drains the queue in small batches until every note is embedded", async () => {
    const a = await seedNote(["a1", "a2", "a3"]);
    const b = await seedNote(["b1", "b2"]);
    const batches: number[] = [];
    const embed: EmbedBatchFn = async (items) => {
      batches.push(items.length);
      return okEmbed(items);
    };

    const queue = new EmbeddingQueueService();
    await queue.start({ modelId: MODEL, embed });
    await queue.enqueueNote({
      noteId: a.noteId,
      modelId: MODEL,
      contentHash: a.contentHash,
      chunks: a.chunks,
    });
    await queue.enqueueNote({
      noteId: b.noteId,
      modelId: MODEL,
      contentHash: b.contentHash,
      chunks: b.chunks,
    });
    await queue.whenIdle();

    expect(Math.max(...batches)).toBeLessThanOrEqual(
      EMBEDDING_QUEUE_BATCH_SIZE,
    );
    expect(await db.embeddings.count()).toBe(5);
    expect(await db.embeddingJobs.count()).toBe(0);
    for (const n of [a, b]) {
      expect((await db.noteHashes.get(n.noteId))?.lastEmbeddedHash).toBe("h1");
    }
  });

  it("resumes jobs left in progress by an interrupted session on start", async () => {
    const note = await seedNote(["a", "b"]);
    await enqueue(note);
    // Simulate a reload mid-batch: jobs were claimed, nothing was persisted.
    await claimPendingJobs(MODEL, 4);
    expect(await db.embeddings.count()).toBe(0);

    const queue = new EmbeddingQueueService();
    await queue.start({ modelId: MODEL, embed: okEmbed });
    await queue.whenIdle();

    expect(await db.embeddings.count()).toBe(2);
    expect((await db.noteHashes.get(note.noteId))?.lastEmbeddedHash).toBe("h1");
  });

  it("writes no duplicate embeddings when a job is processed twice", async () => {
    const note = await seedNote(["a"]);
    await enqueue(note);
    const first = await claimPendingJobs(MODEL, 4);
    // A restart re-queues the in-flight job while the old batch still finishes.
    await recoverInterruptedJobs();
    const second = await claimPendingJobs(MODEL, 4);

    await completeJobs(first, await okEmbed(first));
    await completeJobs(second, await okEmbed(second));
    expect(await db.embeddings.count()).toBe(1);
    expect(await db.embeddingJobs.count()).toBe(0);
  });

  it("retries after a failure and eventually completes", async () => {
    {
      const note = await seedNote(["a"]);
      let calls = 0;
      const flaky: EmbedBatchFn = async (items) => {
        if (++calls === 1) throw new Error("worker terminated");
        return okEmbed(items);
      };
      const queue = new EmbeddingQueueService({ retryBaseDelayMs: 5 });
      await queue.enqueueNote({
        noteId: note.noteId,
        modelId: MODEL,
        contentHash: note.contentHash,
        chunks: note.chunks,
      });
      await queue.start({ modelId: MODEL, embed: flaky });
      await queue.whenIdle();
      expect(calls).toBe(2);
      expect(await db.embeddings.count()).toBe(1);
      expect((await db.noteHashes.get(note.noteId))?.lastEmbeddedHash).toBe(
        "h1",
      );
    }
  });

  it("isolates a poison chunk instead of failing its neighbours forever", async () => {
    {
      const note = await seedNote(["ok1", "poison", "ok2"]);
      const embed: EmbedBatchFn = async (items) => {
        if (items.some((i) => i.text === "poison")) throw new Error("bad");
        return okEmbed(items);
      };
      const queue = new EmbeddingQueueService({ retryBaseDelayMs: 1 });
      await queue.enqueueNote({
        noteId: note.noteId,
        modelId: MODEL,
        contentHash: note.contentHash,
        chunks: note.chunks,
      });
      await queue.start({ modelId: MODEL, embed });
      await queue.whenIdle();
      const embedded = (await db.embeddings.toArray()).map((e) => e.chunkId);
      expect(embedded.sort()).toEqual(
        [note.chunks[0].id, note.chunks[2].id].sort(),
      );
      const jobs = await db.embeddingJobs
        .where("status")
        .equals("failed")
        .toArray();
      expect(jobs.map((j) => j.text)).toEqual(["poison"]);
      // The note is not marked embedded while a chunk is missing.
      expect(
        (await db.noteHashes.get(note.noteId))?.lastEmbeddedHash,
      ).toBeUndefined();
    }
  });
});
