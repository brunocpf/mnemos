import { describe, expect, it, vi } from "vitest";

import {
  type ChunkStore,
  createMemoryStore,
} from "@/lib/resumable-download/chunk-store";
import { createResumableFetch } from "@/lib/resumable-download/resumable-fetch";

const URL_A = "https://huggingface.co/org/model/resolve/main/onnx/model.onnx";
const CHUNK = 10;

function makeFile(size: number, seed = 1) {
  return Uint8Array.from({ length: size }, (_, i) => (i * 7 + seed) % 251);
}

function fakeServer(
  file: Uint8Array,
  opts: { etag?: string; ignoreRange?: boolean } = {},
) {
  const ranges: (string | null)[] = [];
  let failNext = 0;
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void input;
    const range = new Headers(init?.headers).get("Range");
    ranges.push(range);
    if (failNext > 0) {
      failNext--;
      return new Response("busy", { status: 503 });
    }
    if (!range || opts.ignoreRange)
      return new Response(file as Uint8Array<ArrayBuffer>, { status: 200 });
    const [, s, e] = range.match(/bytes=(\d+)-(\d+)/)!;
    const start = Number(s);
    const end = Math.min(Number(e), file.length - 1);
    return new Response(file.slice(start, end + 1) as Uint8Array<ArrayBuffer>, {
      status: 206,
      headers: {
        "content-range": `bytes ${start}-${end}/${file.length}`,
        etag: opts.etag ?? '"v1"',
      },
    });
  });
  return { fn, ranges, failOnce: (n = 1) => (failNext = n) };
}

function make(
  file: Uint8Array,
  store: ChunkStore = createMemoryStore(),
  extra = {},
) {
  const server = fakeServer(file, extra);
  const onStorageIssue = vi.fn();
  const doFetch = createResumableFetch({
    store,
    fetchImpl: server.fn as unknown as typeof fetch,
    chunkSize: CHUNK,
    sleep: async () => undefined,
    onStorageIssue,
  });
  return { store, server, doFetch, onStorageIssue };
}

async function readAll(res: Response) {
  return new Uint8Array(await res.arrayBuffer());
}

describe("createResumableFetch", () => {
  it("downloads in ranged chunks and returns the full file", async () => {
    const file = makeFile(25);
    const { doFetch, server, store } = make(file);
    const res = await doFetch(URL_A);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-length")).toBe("25");
    expect(await readAll(res)).toEqual(file);
    expect(server.ranges).toEqual(["bytes=0-9", "bytes=10-19", "bytes=20-24"]);
    const [meta] = await store.list();
    expect(meta).toMatchObject({ complete: true, stored: 3, total: 25 });
  });

  it("resumes after the last stored chunk when interrupted", async () => {
    const file = makeFile(45);
    const store = createMemoryStore();
    const first = make(file, store);
    const res = await first.doFetch(URL_A);
    const reader = res.body!.getReader();
    await reader.read();
    await reader.read(); // chunks 0 and 1 delivered and stored
    await reader.cancel();

    const second = make(file, store);
    const resumed = await second.doFetch(URL_A);
    expect(second.server.ranges[0]).toBe("bytes=20-29");
    expect(await readAll(resumed)).toEqual(file);
    expect(second.server.ranges).toEqual([
      "bytes=20-29",
      "bytes=30-39",
      "bytes=40-44",
    ]);
  });

  it("restarts from zero when the file changed on the server", async () => {
    const store = createMemoryStore();
    const old = make(makeFile(35), store, { etag: '"old"' });
    const reader = (await old.doFetch(URL_A)).body!.getReader();
    await reader.read();
    await reader.read();
    await reader.cancel();

    const newFile = makeFile(35, 9);
    const fresh = make(newFile, store, { etag: '"new"' });
    expect(await readAll(await fresh.doFetch(URL_A))).toEqual(newFile);
    expect(fresh.server.ranges.slice(0, 2)).toEqual([
      "bytes=20-29",
      "bytes=0-9",
    ]);
  });

  it("replays a completed download without network access", async () => {
    const file = makeFile(33);
    const store = createMemoryStore();
    await readAll(await make(file, store).doFetch(URL_A));
    const again = make(file, store);
    expect(await readAll(await again.doFetch(URL_A))).toEqual(file);
    expect(again.server.fn).not.toHaveBeenCalled();
  });

  it("retries transient server errors", async () => {
    const file = makeFile(25);
    const { doFetch, server } = make(file);
    server.failOnce(2);
    expect(await readAll(await doFetch(URL_A))).toEqual(file);
  });

  it("falls back to the plain response when Range is ignored", async () => {
    const file = makeFile(25);
    const { doFetch, store } = make(file, createMemoryStore(), {
      ignoreRange: true,
    });
    expect(await readAll(await doFetch(URL_A))).toEqual(file);
    expect(await store.list()).toEqual([]);
  });

  it("does not touch other URLs or caller-supplied Range requests", async () => {
    const file = makeFile(25);
    const { doFetch, server } = make(file);
    await doFetch("https://example.com/file.bin");
    await doFetch(URL_A, { headers: { Range: "bytes=0-1" } });
    expect(server.ranges).toEqual([null, "bytes=0-1"]);
  });

  it("still downloads when storage is full and reports it", async () => {
    const file = makeFile(35);
    const base = createMemoryStore();
    const store: ChunkStore = {
      ...base,
      putChunk: async () => {
        throw Object.assign(new Error("full"), { name: "QuotaExceededError" });
      },
    };
    const { doFetch, onStorageIssue } = make(file, store);
    expect(await readAll(await doFetch(URL_A))).toEqual(file);
    expect(onStorageIssue).toHaveBeenCalledWith("quota");
    expect(await base.list()).toEqual([]);
  });

  it("serves small files in one request", async () => {
    const file = makeFile(8);
    const { doFetch, server, store } = make(file);
    expect(await readAll(await doFetch(URL_A))).toEqual(file);
    expect(server.ranges).toHaveLength(1);
    expect(await store.list()).toEqual([]);
  });

  it("falls back to a plain request when a small file's Content-Range lies", async () => {
    // Hugging Face reports the compressed size in Content-Range for small
    // text files while the (decoded) body is longer.
    const file = makeFile(8);
    const calls: (string | null)[] = [];
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const range = new Headers(init?.headers).get("Range");
        calls.push(range);
        if (!range)
          return new Response(file as Uint8Array<ArrayBuffer>, { status: 200 });
        return new Response(file as Uint8Array<ArrayBuffer>, {
          status: 206,
          headers: { "content-range": "bytes 0-4/5", etag: '"v1"' },
        });
      },
    );
    const doFetch = createResumableFetch({
      store: createMemoryStore(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      chunkSize: CHUNK,
      sleep: async () => undefined,
    });
    expect(await readAll(await doFetch(URL_A))).toEqual(file);
    expect(calls).toEqual(["bytes=0-9", null]);
  });
});
