"use client";

import type {
  EmbedChunksResponse,
  EmbedErrorResponse,
  EmbedQueryResponse,
  EmbedResponse,
} from "@/workers/embedder.worker";

type ChunkItem = { chunkId: string; text: string };

type EmbedderCallbacks = {
  onChunksResult?: (response: Omit<EmbedChunksResponse, "type">) => void;
  onQueryResult?: (response: Omit<EmbedQueryResponse, "type">) => void;
  onError?: (response: Omit<EmbedErrorResponse, "type">) => void;
};

export class EmbedderService {
  private worker: Worker | null = null;
  private latestVersionByNote = new Map<string, number>();
  private latestQueryVersion = 0;

  private pendingQuery = new Map<
    number,
    {
      resolve: (vec: Float32Array) => void;
      reject: (err: Error) => void;
    }
  >();

  private modelId: string;

  constructor(
    options: { modelId?: string; callbacks?: EmbedderCallbacks } = {},
  ) {
    this.modelId = options.modelId ?? "Supabase/gte-small";

    if (typeof window === "undefined" || typeof Worker === "undefined") return;

    this.worker = new Worker(
      new URL("@/workers/embedder.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    this.worker.onmessage = (ev: MessageEvent<EmbedResponse>) => {
      const res = ev.data;

      switch (res.type) {
        case "CHUNKS_RESULT": {
          const latest = this.latestVersionByNote.get(res.noteId);
          if (latest !== res.version) return;

          options.callbacks?.onChunksResult?.(res);
          break;
        }

        case "QUERY_RESULT": {
          if (this.latestQueryVersion !== res.version) return;

          options.callbacks?.onQueryResult?.(res);

          const pending = this.pendingQuery.get(res.version);

          if (pending) {
            this.pendingQuery.delete(res.version);
            pending.resolve(new Float32Array(res.vectorBuffer));
          }
          break;
        }

        case "ERROR": {
          options.callbacks?.onError?.(res);
          const pending = this.pendingQuery.get(this.latestQueryVersion);
          if (pending) {
            this.pendingQuery.delete(this.latestQueryVersion);
            pending.reject(new Error(res.message));
          }
          break;
        }
      }
    };
  }

  setModel(modelId: string) {
    this.modelId = modelId;
  }

  embedChunks(noteId: string, items: ChunkItem[]) {
    if (!this.worker) return 0;

    const version = (this.latestVersionByNote.get(noteId) ?? 0) + 1;
    this.latestVersionByNote.set(noteId, version);

    this.worker.postMessage({
      type: "EMBED_CHUNKS" as const,
      noteId,
      version,
      items,
      modelId: this.modelId,
    });

    return version;
  }

  embedQuery(text: string) {
    if (!this.worker) return 0;

    const version = this.latestQueryVersion + 1;
    this.latestQueryVersion = version;

    this.worker.postMessage({
      type: "EMBED_QUERY" as const,
      version,
      text,
      modelId: this.modelId,
    });

    return version;
  }

  embedQueryAsync(text: string, timeoutMs = 30_000): Promise<Float32Array> {
    if (!this.worker) {
      return Promise.reject(
        new Error("Web Workers are not available in this environment."),
      );
    }

    const version = this.embedQuery(text);

    return new Promise<Float32Array>((resolve, reject) => {
      this.pendingQuery.set(version, { resolve, reject });

      const t = window.setTimeout(() => {
        const pending = this.pendingQuery.get(version);
        if (!pending) return;
        this.pendingQuery.delete(version);
        reject(new Error(`Embedding query timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      const origResolve = resolve;
      const origReject = reject;
      this.pendingQuery.set(version, {
        resolve: (vec) => {
          window.clearTimeout(t);
          origResolve(vec);
        },
        reject: (err) => {
          window.clearTimeout(t);
          origReject(err);
        },
      });
    });
  }

  dispose() {
    for (const [, promise] of this.pendingQuery) {
      promise.reject(new Error("EmbedderService disposed."));
    }

    this.pendingQuery.clear();

    this.worker?.terminate();
    this.worker = null;

    this.latestVersionByNote.clear();
    this.latestQueryVersion = 0;
  }
}
