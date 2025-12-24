import { MnemosDb } from "@/client-data/db";
import {
  ChunkingClient,
  ChunkingResultEvent,
} from "@/services/chunking-client";
import {
  EmbeddingChunksResultEvent,
  EmbeddingClient,
  EmbeddingErrorEvent,
} from "@/services/embedding-client";

export class EmbedderService {
  private pendingEmbedHashByNote: Map<
    string,
    { version: number; contentHash: string }
  >;

  constructor(
    private db: MnemosDb,
    private chunkingClient: ChunkingClient,
    private embeddingClient: EmbeddingClient,
  ) {
    this.pendingEmbedHashByNote = new Map<
      string,
      { version: number; contentHash: string }
    >();

    this.chunkingClient.addEventListener("result", this.handleChunkResult);
    this.embeddingClient.addEventListener(
      "chunks",
      this.handleEmbeddingChunksResult,
    );
    this.embeddingClient.addEventListener("error", this.handleEmbeddingError);
  }

  schedule(
    data: {
      id: string;
      title?: string;
      content: string;
    },
    delayMs = 1000,
  ) {
    this.chunkingClient.schedule(data, delayMs);
  }

  flush(data: { id: string; title?: string; content: string }) {
    this.chunkingClient.flush(data);
  }

  dispose() {
    this.chunkingClient.removeEventListener("result", this.handleChunkResult);
    this.embeddingClient.removeEventListener(
      "chunks",
      this.handleEmbeddingChunksResult,
    );
    this.embeddingClient.removeEventListener(
      "error",
      this.handleEmbeddingError,
    );
    this.chunkingClient.dispose();
    this.embeddingClient.dispose();
  }

  private performEmbeddings(
    noteId: string,
    items: { id: string; text: string }[],
    contentHash: string,
  ) {
    // TODO: Use a server function/API as a fallback embedding mechanism when
    // the client-side embedding pipeline (e.g., WebWorkers or local model loading)
    // is unavailable or fails, so embeddings can still be generated remotely.
    const version = this.embeddingClient.embedChunks(
      noteId,
      items.map((c) => ({
        chunkId: c.id,
        text: c.text,
      })),
    );

    this.pendingEmbedHashByNote.set(noteId, { version, contentHash });
  }

  private handleChunkResult = async (ev: ChunkingResultEvent) => {
    const { noteId, chunks, contentHash } = ev.detail;
    const currentModelId = this.embeddingClient.modelId;

    const noteHash = await this.db.noteHashes.get(noteId);

    const upToDateChunks = noteHash?.lastIndexedHash === contentHash;

    const upToDateEmbeddings =
      noteHash?.lastEmbeddedHash === contentHash &&
      noteHash?.lastEmbeddingModelId === currentModelId;

    if (upToDateChunks && upToDateEmbeddings) return;

    const prev = await this.db.chunks.where("noteId").equals(noteId).toArray();

    const prevById = new Map(prev.map((c) => [c.id, c]));
    const nextIds = new Set(chunks.map((c) => c.id));

    const removedIds = prev.filter((c) => !nextIds.has(c.id)).map((c) => c.id);

    const addedOrChanged = chunks.filter((c) => {
      const p = prevById.get(c.id);
      return !p || p.hash !== c.hash;
    });

    await this.db.transaction(
      "rw",
      this.db.chunks,
      this.db.embeddings,
      this.db.noteHashes,
      async () => {
        if (removedIds.length) {
          await this.db.chunks.bulkDelete(removedIds);

          await this.db.embeddings.bulkDelete(
            removedIds.map((chunkId) => [chunkId, currentModelId] as const),
          );
        }

        await this.db.chunks.bulkPut(chunks);

        await this.db.noteHashes.put({
          noteId,
          lastIndexedHash: contentHash,
          indexedAt: new Date(),
        });
      },
    );

    if (addedOrChanged.length) {
      this.performEmbeddings(noteId, addedOrChanged, contentHash);
    }
  };

  private handleEmbeddingChunksResult = async (
    ev: EmbeddingChunksResultEvent,
  ) => {
    const { noteId, vectors, version } = ev.detail;
    const currentModelId = this.embeddingClient.modelId;

    await this.db.transaction(
      "rw",
      this.db.embeddings,
      this.db.noteHashes,
      async () => {
        const pending = this.pendingEmbedHashByNote.get(noteId);
        if (!pending || pending.version !== version) return;

        const { contentHash } = pending;

        await this.db.embeddings.bulkPut(
          vectors.map((v) => ({
            chunkId: v.chunkId,
            noteId,
            modelId: currentModelId,
            vectorBuffer: v.vectorBuffer,
            createdAt: new Date(),
          })),
        );

        await this.db.noteHashes.put({
          noteId,
          lastEmbeddingModelId: currentModelId,
          lastEmbeddedHash: contentHash,
          embeddedAt: new Date(),
        });
      },
    );
  };

  private handleEmbeddingError = (ev: EmbeddingErrorEvent) => {
    const { message } = ev.detail;
    console.error("Embedder worker error:", message);
  };
}
