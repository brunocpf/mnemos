import { toast } from "sonner";

import { MnemosDb } from "@/client-data/db";
import { embed, embedQuery } from "@/server-actions/embed";
import {
  type ChunkingResultEvent,
  ChunkingClient,
} from "@/services/chunking-client";
import {
  type EmbeddingChunksResultEvent,
  type EmbeddingErrorEvent,
  EmbeddingClient,
} from "@/services/embedding-client";
import { SettingsService } from "@/services/settings-service";
import type { EmbedRequest } from "@/workers/embedding.worker";

export class EmbedderService {
  private pendingEmbedHashByNote: Map<
    string,
    { version: number; contentHash: string }
  >;

  constructor(
    private db: MnemosDb,
    private settingsService: SettingsService,
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

  get modelId() {
    return this.embeddingClient.modelId;
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

  async embedQuery(text: string, timeoutMs = 30000) {
    return this.embeddingClient.embedQueryAsync(text, timeoutMs);
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
  }

  private async performEmbeddings(
    noteId: string,
    items: { id: string; text: string }[],
    contentHash: string,
  ) {
    const version = this.embeddingClient.embedChunks(
      noteId,
      items.map((c) => ({
        chunkId: c.id,
        text: c.text,
      })),
    );

    this.pendingEmbedHashByNote.set(noteId, { version, contentHash });
  }

  private async performServerSideEmbeddings(request: EmbedRequest) {
    switch (request.type) {
      case "EMBED_CHUNKS": {
        const { noteId, items, version } = request;
        const vectors = await embed(
          items.map((item) => ({
            chunkId: item.chunkId,
            text: item.text,
          })),
        );

        this.embeddingClient.dispatchTypedEvent(
          "chunks",
          new CustomEvent("chunks", {
            detail: {
              noteId,
              vectors,
              version,
            },
          }),
        );
        break;
      }
      case "EMBED_QUERY": {
        const { version, text } = request;
        const vector = await embedQuery(text);

        this.embeddingClient.dispatchTypedEvent(
          "query",
          new CustomEvent("query", {
            detail: {
              version,
              vectorBuffer: vector.buffer,
            },
          }),
        );

        break;
      }
    }
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
      await this.performEmbeddings(noteId, addedOrChanged, contentHash);
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

  private handleEmbeddingError = async (ev: EmbeddingErrorEvent) => {
    const { message, request } = ev.detail;
    console.error("Embedder worker error:", message);

    await this.db.localEmbeddingErrors.add({
      id: crypto.randomUUID(),
      message,
      timestamp: new Date(),
    });

    const allowFallback =
      this.settingsService.getSetting("embeddingHost") === "allow-fallback";
    const dismissEmbeddingErrorMessages = this.settingsService.getSetting(
      "dismissEmbeddingErrorMessages",
    );

    if (allowFallback && navigator.onLine) {
      this.performServerSideEmbeddings(request);
      if (!dismissEmbeddingErrorMessages) {
        toast.error(
          "An error has occurred while indexing notes on your device.",
          {
            description: "Falling back to remote indexing",
            action: {
              label: "Dismiss",
              onClick: () => {
                this.settingsService.setSetting(
                  "dismissEmbeddingErrorMessages",
                  true,
                );
                toast.info(
                  "You will no longer see error messages about local indexing failures.",
                  {
                    position: "top-center",
                  },
                );
              },
            },
          },
        );
      }
    } else {
      toast.error(
        "An error has occurred while indexing notes on your device.",
        {
          description: navigator.onLine
            ? "You may lose search functionality. You can enable a fallback to remote indexing (requires internet connection)."
            : "You may lose search functionality.",
          action: {
            props: {
              disabled: !navigator.onLine,
            },
            label: navigator.onLine
              ? "Enable Fallback"
              : "Fallback Unavailable",
            onClick: () => {
              this.performServerSideEmbeddings(request);
              this.settingsService.setSetting(
                "embeddingHost",
                "allow-fallback",
              );
              toast.info(
                "Fallback enabled. If an error occurs, indexing will be performed remotely. You can change this setting later.",
                {
                  position: "top-center",
                },
              );
            },
          },
        },
      );
    }
  };
}
