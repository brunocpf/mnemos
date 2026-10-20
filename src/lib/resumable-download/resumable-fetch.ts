import { sha256 } from "@/lib/sha256";

import { type ChunkStore, type DownloadMeta } from "./chunk-store";

export type StorageIssue = "quota" | "unavailable";

export type ResumableFetchOptions = {
  store: ChunkStore;
  fetchImpl?: typeof fetch;
  chunkSize?: number;
  retries?: number;
  backoffMs?: number;
  /** Which URLs to take over. Everything else goes straight to `fetchImpl`. */
  shouldHandle?: (url: string) => boolean;
  /** Serialises work on one download (across workers/tabs when possible). */
  acquire?: (id: string) => Promise<() => void>;
  /** Called once per download when chunks can no longer be persisted. */
  onStorageIssue?: (issue: StorageIssue) => void;
  sleep?: (ms: number) => Promise<void>;
};

export const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;

const isHfResolveUrl = (url: string) =>
  /^https:\/\/huggingface\.co\/.+\/resolve\//.test(url);

const memoryLocks = new Map<string, Promise<void>>();

/** Web Locks when available, otherwise a per-realm queue. */
export async function acquireDownloadLock(id: string): Promise<() => void> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await new Promise<void>((acquired, failed) => {
      navigator.locks
        .request(`mnemos-download:${id}`, () => {
          acquired();
          return held;
        })
        .catch(failed);
    });
    return release;
  }

  const previous = memoryLocks.get(id) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => (release = resolve));
  memoryLocks.set(
    id,
    previous.then(() => current),
  );
  await previous;
  return release;
}

function parseContentRange(value: string | null) {
  const match = value?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
  if (!match) return undefined;
  return {
    start: Number(match[1]),
    end: Number(match[2]),
    total: Number(match[3]),
  };
}

function cleanUrl(url: string) {
  const u = new URL(url);
  u.search = "";
  u.hash = "";
  return u.href;
}

function urlOf(input: RequestInfo | URL) {
  return typeof input === "string"
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
}

/**
 * A `fetch` replacement for transformers.js (`env.fetch`) that downloads large
 * Hugging Face files in Range-requested chunks and keeps each finished chunk in
 * `store`. The next attempt continues after the last stored chunk instead of
 * starting over. The caller still sees a plain 200 response with the full
 * length, so progress reporting keeps working (stored chunks replay instantly).
 */
export function createResumableFetch(options: ResumableFetchOptions) {
  const {
    store,
    fetchImpl = (...args: Parameters<typeof fetch>) => fetch(...args),
    chunkSize = DEFAULT_CHUNK_SIZE,
    retries = 3,
    backoffMs = 500,
    shouldHandle = isHfResolveUrl,
    acquire = acquireDownloadLock,
    onStorageIssue,
    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  } = options;

  async function fetchRange(
    url: string,
    init: RequestInit | undefined,
    start: number,
    end: number,
  ) {
    const headers = new Headers(init?.headers);
    headers.set("Range", `bytes=${start}-${end}`);
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await sleep(backoffMs * 2 ** (attempt - 1));
      try {
        const res = await fetchImpl(url, { ...init, headers });
        if (res.status >= 500 || res.status === 429) {
          lastError = new Error(`HTTP ${res.status} for ${url}`);
          continue;
        }
        return res;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  async function readExact(res: Response, expected: number) {
    const data = new Uint8Array(await res.arrayBuffer());
    if (data.length !== expected) {
      throw new Error(
        `Chunk size mismatch: got ${data.length}, expected ${expected}`,
      );
    }
    return data;
  }

  const chunkLength = (meta: { total: number; chunkSize: number }, i: number) =>
    Math.min(meta.chunkSize, meta.total - i * meta.chunkSize);

  function textResponse(data: Uint8Array, res: Response) {
    const headers = new Headers({ "content-length": String(data.length) });
    const type = res.headers.get("content-type");
    if (type) headers.set("content-type", type);
    return new Response(data as Uint8Array<ArrayBuffer>, {
      status: 200,
      headers,
    });
  }

  function streamResponse(
    meta: DownloadMeta,
    source: Response,
    produce: (index: number) => Promise<Uint8Array>,
    release: () => void,
    startIndex: number,
  ) {
    let index = startIndex;
    const body = new ReadableStream<Uint8Array>(
      {
        async pull(controller) {
          try {
            if (index >= meta.chunks) {
              controller.close();
              release();
              return;
            }
            controller.enqueue(await produce(index++));
          } catch (error) {
            release();
            controller.error(error);
          }
        },
        cancel() {
          release();
        },
      },
      // Pull only when the reader asks, so at most one chunk is in flight.
      { highWaterMark: 0 },
    );
    const headers = new Headers({ "content-length": String(meta.total) });
    const type = source.headers.get("content-type");
    if (type) headers.set("content-type", type);
    return new Response(body, { status: 200, headers });
  }

  async function resumableFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = urlOf(input);
    const method = (init?.method ?? "GET").toUpperCase();
    if (
      method !== "GET" ||
      !shouldHandle(url) ||
      new Headers(init?.headers).has("Range")
    ) {
      return fetchImpl(input, init);
    }

    const id = await sha256(cleanUrl(url));
    const release = await acquire(id);
    let handedOver = false;
    try {
      const res = await prepare(url, init, id, release);
      handedOver = res.handedOver;
      return res.response;
    } finally {
      if (!handedOver) release();
    }
  }

  /**
   * Returns the response to give to the caller. `handedOver` is true when the
   * returned stream owns the lock and will release it itself.
   */
  async function prepare(
    url: string,
    init: RequestInit | undefined,
    id: string,
    release: () => void,
  ): Promise<{ response: Response; handedOver: boolean }> {
    let persist = true;
    const safely = async (fn: () => Promise<void>) => {
      if (!persist) return;
      try {
        await fn();
      } catch (error) {
        persist = false;
        await store.remove(id).catch(() => undefined);
        onStorageIssue?.(
          error instanceof Error &&
            /quota/i.test(`${error.name} ${error.message}`)
            ? "quota"
            : "unavailable",
        );
      }
    };

    let meta: DownloadMeta | undefined;
    try {
      meta = await store.getMeta(id);
    } catch {
      persist = false;
    }

    // Fully stored: replay without touching the network (works offline).
    if (meta?.complete && meta.stored === meta.chunks && persist) {
      const first = await store.getChunk(id, 0).catch(() => undefined);
      if (first && first.length === chunkLength(meta, 0)) {
        const complete = meta;
        const source = new Response(null);
        const read = async (i: number) => {
          const data = await store.getChunk(id, i);
          if (!data || data.length !== chunkLength(complete, i)) {
            await store.remove(id).catch(() => undefined);
            throw new Error(
              "Stored model data is damaged; reload to download it again.",
            );
          }
          return data;
        };
        return {
          response: streamResponse(complete, source, read, release, 0),
          handedOver: true,
        };
      }
      await store.remove(id).catch(() => undefined);
      meta = undefined;
    }

    let resumeFrom = meta && persist ? meta.stored : 0;
    let first = await fetchRange(
      url,
      init,
      resumeFrom * chunkSize,
      resumeFrom * chunkSize + chunkSize - 1,
    );

    const restartFromZero = async () => {
      await store.remove(id).catch(() => undefined);
      meta = undefined;
      resumeFrom = 0;
      first = await fetchRange(url, init, 0, chunkSize - 1);
    };

    // The server ignored Range (200) or answered with an error: not resumable.
    if (first.status !== 206) {
      if (meta) await store.remove(id).catch(() => undefined);
      return { response: first, handedOver: false };
    }

    let range = parseContentRange(first.headers.get("content-range"));
    if (!range) return { response: first, handedOver: false };
    let etag = first.headers.get("etag");

    if (
      meta &&
      (meta.total !== range.total ||
        meta.etag !== etag ||
        meta.chunkSize !== chunkSize)
    ) {
      await restartFromZero();
      if (first.status !== 206) return { response: first, handedOver: false };
      range = parseContentRange(first.headers.get("content-range"));
      if (!range) return { response: first, handedOver: false };
      etag = first.headers.get("etag");
    }

    // Small file: a single chunk, nothing to resume.
    if (range.total <= chunkSize) {
      return {
        response: textResponse(await readExact(first, range.total), first),
        handedOver: false,
      };
    }

    const active: DownloadMeta = meta ?? {
      id,
      url: cleanUrl(url),
      total: range.total,
      etag,
      chunkSize,
      chunks: Math.ceil(range.total / chunkSize),
      stored: 0,
      complete: false,
      updatedAt: Date.now(),
    };
    await safely(() => store.setMeta(active));
    if (!persist && resumeFrom > 0) {
      // Storage broke after we had counted on stored chunks: start over unsaved.
      resumeFrom = 0;
      first = await fetchRange(url, init, 0, chunkSize - 1);
      if (first.status !== 206) return { response: first, handedOver: false };
    }

    let firstBuffer: Uint8Array | undefined;
    const produce = async (i: number): Promise<Uint8Array> => {
      if (i < resumeFrom) {
        const stored = await store.getChunk(id, i);
        if (!stored || stored.length !== chunkLength(active, i)) {
          await store.remove(id).catch(() => undefined);
          throw new Error(
            "Stored model data is damaged; reload to download it again.",
          );
        }
        return stored;
      }

      let data: Uint8Array;
      if (i === resumeFrom) {
        data = firstBuffer ??= await readExact(first, chunkLength(active, i));
      } else {
        const start = i * chunkSize;
        const res = await fetchRange(
          url,
          init,
          start,
          start + chunkLength(active, i) - 1,
        );
        const got = parseContentRange(res.headers.get("content-range"));
        if (
          res.status !== 206 ||
          !got ||
          got.start !== start ||
          got.total !== active.total ||
          res.headers.get("etag") !== active.etag
        ) {
          throw new Error(
            `The file changed while downloading (${url}). Reload to retry.`,
          );
        }
        data = await readExact(res, chunkLength(active, i));
      }

      await safely(async () => {
        await store.putChunk(id, i, data);
        active.stored = i + 1;
        active.complete = active.stored === active.chunks;
        active.updatedAt = Date.now();
        await store.setMeta(active);
      });
      return data;
    };

    // Read the pending first chunk up front so that errors surface early.
    if (resumeFrom < active.chunks) {
      firstBuffer = await readExact(first, chunkLength(active, resumeFrom));
    }

    return {
      response: streamResponse(active, first, produce, release, 0),
      handedOver: true,
    };
  }

  return resumableFetch as typeof fetch;
}
