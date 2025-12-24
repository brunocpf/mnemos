import { TypedEventTarget } from "@/lib/typed-event-target";
import type {
  EmbedChunksResponse,
  EmbedErrorResponse,
  EmbedQueryResponse,
  EmbedResponse,
} from "@/workers/embedding.worker";

type EmbeddingCallbacks = {
  onChunksResult?: (response: Omit<EmbedChunksResponse, "type">) => void;
  onQueryResult?: (response: Omit<EmbedQueryResponse, "type">) => void;
  onError?: (response: Omit<EmbedErrorResponse, "type">) => void;
};

export type EmbeddingChunksResultEvent = CustomEvent<
  Omit<EmbedChunksResponse, "type">
>;
export type EmbeddingQueryResultEvent = CustomEvent<
  Omit<EmbedQueryResponse, "type">
>;
export type EmbeddingErrorEvent = CustomEvent<Omit<EmbedErrorResponse, "type">>;

export class EmbeddingClient extends TypedEventTarget<{
  chunks: EmbeddingChunksResultEvent;
  query: EmbeddingQueryResultEvent;
  error: EmbeddingErrorEvent;
}> {
  private latestVersionByNote = new Map<string, number>();
  private latestQueryVersion = 0;

  private pendingQuery = new Map<
    number,
    {
      resolve: (vec: Float32Array) => void;
      reject: (err: Error) => void;
    }
  >();

  public readonly modelId: string;

  constructor(
    private worker: Worker,
    options: { modelId?: string; callbacks?: EmbeddingCallbacks } = {},
  ) {
    super();

    this.modelId = options.modelId ?? "Supabase/gte-small";

    this.worker.onmessage = (ev: MessageEvent<EmbedResponse>) => {
      const res = ev.data;

      switch (res.type) {
        case "CHUNKS_RESULT": {
          const latest = this.latestVersionByNote.get(res.noteId);
          if (latest !== res.version) return;

          options.callbacks?.onChunksResult?.(res);
          this.dispatchTypedEvent(
            "chunks",
            new CustomEvent("chunks", { detail: res }),
          );
          break;
        }

        case "QUERY_RESULT": {
          if (this.latestQueryVersion !== res.version) return;

          options.callbacks?.onQueryResult?.(res);
          this.dispatchTypedEvent(
            "query",
            new CustomEvent("query", { detail: res }),
          );

          const pending = this.pendingQuery.get(res.version);

          if (pending) {
            this.pendingQuery.delete(res.version);
            pending.resolve(new Float32Array(res.vectorBuffer));
          }
          break;
        }

        case "ERROR": {
          options.callbacks?.onError?.(res);
          this.dispatchTypedEvent(
            "error",
            new CustomEvent("error", { detail: res }),
          );

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

  embedChunks(noteId: string, items: { chunkId: string; text: string }[]) {
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

    this.latestVersionByNote.clear();
    this.latestQueryVersion = 0;
  }
}
