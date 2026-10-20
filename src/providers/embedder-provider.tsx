"use client";

import { proxy } from "comlink";
import { useTranslations } from "next-intl";
import {
  createContext,
  PropsWithChildren,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { db } from "@/client-data/db";
import {
  dropEmbeddingsForOtherModels,
  purgeDeletedNotes,
} from "@/client-data/notes-dal";
import { saveEmbeddings } from "@/client-data/save-embeddings";
import { useComlinkWorker } from "@/hooks/use-comlink-worker";
import { EMBEDDING_MODEL_ID } from "@/lib/embedding-config";
import { ModelDownloadState } from "@/lib/hf-model-worker-service";
import { LIMITS } from "@/lib/server-ai";
import { withTimeout } from "@/lib/with-timeout";
import { useSettings } from "@/providers/settings-provider";
import {
  embed as embedOnServer,
  embedQuery as embedQueryOnServer,
} from "@/server-actions/embed";
import { ChunkingWorkerApi } from "@/workers/chunking.worker";
import type { EmbeddingWorkerApi } from "@/workers/embedding.worker";

const modelId = EMBEDDING_MODEL_ID;

const SERVER_EMBED_BATCH_SIZE = LIMITS.maxChunks;

export type EmbeddingNoteData = {
  id: string;
  title?: string;
  content: string;
};

export interface EmbedderContextValue {
  schedule: (data: EmbeddingNoteData, delayMs?: number) => void;
  flush: (data: EmbeddingNoteData) => void;
  embedQuery(
    text: string,
    timeoutMs?: number,
  ): Promise<Float32Array<ArrayBufferLike>>;
  isReady: boolean;
  modelId?: string;
  modelDownloadState?: ModelDownloadState;
}

export const EmbedderContext = createContext<EmbedderContextValue>({
  schedule: () => {
    throw new Error("Not implemented");
  },
  flush: () => {
    throw new Error("Not implemented");
  },
  embedQuery: async () => {
    throw new Error("Not implemented");
  },
  isReady: false,
  modelId: "unknown",
  modelDownloadState: undefined,
});

export function EmbedderProvider({ children }: PropsWithChildren) {
  const t = useTranslations("Embedder");
  const { settings, changeSetting } = useSettings();
  const { proxy: chunkingWorkerApi } = useComlinkWorker<ChunkingWorkerApi>(
    () =>
      new Worker(new URL("@/workers/chunking.worker.ts", import.meta.url), {
        type: "module",
      }),
    [],
  );

  const { proxy: embeddingWorkerApi } = useComlinkWorker<EmbeddingWorkerApi>(
    () =>
      new Worker(new URL("@/workers/embedding.worker.ts", import.meta.url), {
        type: "module",
      }),
    [],
  );

  const [modelDownloadState, setModelDownloadState] =
    useState<ModelDownloadState>();

  useEffect(() => {
    let subscriptionId: number | undefined;

    async function initWorker() {
      setModelDownloadState(undefined);

      await embeddingWorkerApi?.init();
      subscriptionId = await embeddingWorkerApi?.subscribeDownloadState(
        proxy((state) => {
          setModelDownloadState(state);
        }),
      );
    }

    initWorker();

    return () => {
      if (subscriptionId !== undefined) {
        embeddingWorkerApi?.unsubscribeDownloadState(subscriptionId);
      }
    };
  }, [embeddingWorkerApi]);

  const timersRef = useRef<Map<string, number>>(new Map());
  const versionsRef = useRef<Map<string, number>>(new Map());
  const latestVersionRef = useRef<Map<string, number>>(new Map());
  const pendingEmbedRef = useRef<
    Map<string, { version: number; contentHash: string }>
  >(new Map());
  const queryVersionRef = useRef(0);

  const isSupersededQueryError = useCallback((error: unknown) => {
    if (error instanceof DOMException && error.name === "AbortError")
      return true;
    if (
      error instanceof Error &&
      error.message === "Embedding query was superseded."
    )
      return true;
    return false;
  }, []);

  const getErrorMessage = useCallback(
    (error: unknown) =>
      error instanceof Error ? error.message : String(error),
    [],
  );

  const showEmbeddingErrorToast = useCallback(
    (opts: { allowFallback: boolean; performFallback: () => void }) => {
      if (opts.allowFallback && navigator.onLine) {
        if (settings.dismissEmbeddingErrorMessages) return;

        toast.error(t("toasts.deviceIndexingError.title"), {
          description: t("toasts.deviceIndexingError.descriptionFallbacking"),
          dismissible: true,
          position: "top-center",
          action: {
            label: t("toasts.deviceIndexingError.actions.dismiss"),
            onClick: () => {
              changeSetting("dismissEmbeddingErrorMessages", true);
              toast.info(t("toasts.deviceIndexingError.dismissedInfo"), {
                position: "top-center",
              });
            },
          },
        });
        return;
      }

      toast.error(t("toasts.deviceIndexingError.title"), {
        description: navigator.onLine
          ? t("toasts.deviceIndexingError.descriptionOnlineNoFallback")
          : t("toasts.deviceIndexingError.descriptionOffline"),
        dismissible: true,
        position: "top-center",
        action: {
          props: { disabled: !navigator.onLine },
          label: navigator.onLine
            ? t("toasts.deviceIndexingError.actions.enableFallback")
            : t("toasts.deviceIndexingError.actions.fallbackUnavailable"),
          onClick: () => {
            opts.performFallback();
            changeSetting("embeddingHost", "allow-fallback");
            toast.info(t("toasts.deviceIndexingError.fallbackEnabledInfo"), {
              position: "top-center",
            });
          },
        },
      });
    },
    [changeSetting, settings.dismissEmbeddingErrorMessages, t],
  );

  const performServerSideEmbeddings = useCallback(
    async (request: {
      noteId: string;
      version: number;
      items: { chunkId: string; text: string }[];
      contentHash: string;
    }) => {
      // The server caps the number of chunks per request.
      const vectors: { chunkId: string; vectorArray: number[] }[] = [];
      for (let i = 0; i < request.items.length; i += SERVER_EMBED_BATCH_SIZE) {
        const res = await embedOnServer(
          request.items.slice(i, i + SERVER_EMBED_BATCH_SIZE),
        );
        if (!res.ok) throw new Error(res.message);
        vectors.push(...res.vectors);
      }

      if (!modelId) {
        throw new Error("Embedding model ID is not available.");
      }

      if (latestVersionRef.current.get(request.noteId) !== request.version)
        return undefined;

      await saveEmbeddings({
        noteId: request.noteId,
        modelId,
        contentHash: request.contentHash,
        vectors: vectors.map((v) => ({
          chunkId: v.chunkId,
          vectorBuffer: Float32Array.from(v.vectorArray).buffer,
        })),
      });
      return undefined;
    },
    [],
  );

  const embedChunksForNote = useCallback(
    async (args: {
      noteId: string;
      version: number;
      items: { chunkId: string; text: string }[];
      contentHash: string;
    }) => {
      if (!embeddingWorkerApi) {
        throw new Error("Embedding worker is not available");
      }
      if (!modelId) {
        throw new Error("Embedding model ID is not available");
      }

      pendingEmbedRef.current.set(args.noteId, {
        version: args.version,
        contentHash: args.contentHash,
      });

      try {
        const result = await embeddingWorkerApi.embedChunks({
          noteId: args.noteId,
          version: args.version,
          items: args.items,
        });

        if (result === null) {
          return;
        }

        const pending = pendingEmbedRef.current.get(args.noteId);
        if (!pending || pending.version !== args.version) return;

        await saveEmbeddings({
          noteId: args.noteId,
          modelId,
          contentHash: pending.contentHash,
          vectors: result.vectors,
        });
      } catch (error: unknown) {
        const message = getErrorMessage(error);

        await db.localEmbeddingErrors.add({
          id: crypto.randomUUID(),
          type: "EMBED_CHUNKS",
          message,
          timestamp: new Date(),
        });

        const allowFallback = settings.embeddingHost === "allow-fallback";

        const performFallback = () => {
          void performServerSideEmbeddings({
            noteId: args.noteId,
            version: args.version,
            items: args.items,
            contentHash: args.contentHash,
          }).catch((fallbackError: unknown) => {
            console.error("Server-side embedding failed", fallbackError);
          });
        };

        if (allowFallback && navigator.onLine) {
          performFallback();
        }

        showEmbeddingErrorToast({ allowFallback, performFallback });
      }
    },
    [
      embeddingWorkerApi,
      getErrorMessage,
      performServerSideEmbeddings,
      settings.embeddingHost,
      showEmbeddingErrorToast,
    ],
  );

  const runChunkingAndIndexing = useCallback(
    async (data: EmbeddingNoteData, version: number) => {
      if (!chunkingWorkerApi) {
        throw new Error("Chunking worker is not available");
      }

      // The stored note is the source of truth for the title, so callers that
      // only know the content (the editor) still embed the current title.
      const stored = await db.notes.get(data.id);
      if (!stored || stored.deleted) return;

      const result = await chunkingWorkerApi.chunkNote({
        noteId: data.id,
        version,
        title: stored.title ?? data.title,
        content: data.content,
        settings: {
          targetChars: 800,
          maxChars: 1200,
        },
      });

      const latest = latestVersionRef.current.get(data.id);
      if (latest !== version) return;

      const currentModelId = modelId;

      const noteHash = await db.noteHashes.get(data.id);
      const upToDateChunks = noteHash?.lastIndexedHash === result.contentHash;
      const upToDateEmbeddings =
        noteHash?.lastEmbeddedHash === result.contentHash &&
        noteHash?.lastEmbeddingModelId === currentModelId;

      if (upToDateChunks && upToDateEmbeddings) return;

      if (!upToDateChunks) {
        const prev = await db.chunks.where("noteId").equals(data.id).toArray();
        const nextIds = new Set(result.chunks.map((c) => c.id));

        const removedIds = prev
          .filter((c) => !nextIds.has(c.id))
          .map((c) => c.id);

        await db.transaction(
          "rw",
          db.chunks,
          db.embeddings,
          db.noteHashes,
          async () => {
            if (removedIds.length) {
              await db.chunks.bulkDelete(removedIds);
              await db.embeddings.where("chunkId").anyOf(removedIds).delete();
            }

            await db.chunks.bulkPut(result.chunks);
            const prevHash = await db.noteHashes.get(data.id);
            await db.noteHashes.put({
              ...prevHash,
              noteId: data.id,
              lastIndexedHash: result.contentHash,
              indexedAt: new Date(),
            });
          },
        );
      }

      if (!currentModelId) return;

      // Only embed chunks that have no vector for the current model yet.
      const existing = await db.embeddings
        .where("chunkId")
        .anyOf(result.chunks.map((c) => c.id))
        .filter((e) => e.modelId === currentModelId)
        .primaryKeys();
      const have = new Set(existing.map(([chunkId]) => chunkId));
      const items = result.chunks
        .filter((c) => !have.has(c.id))
        .map((c) => ({ chunkId: c.id, text: c.text }));

      if (!items.length) {
        if (!upToDateEmbeddings) {
          await saveEmbeddings({
            noteId: data.id,
            modelId: currentModelId,
            contentHash: result.contentHash,
            vectors: [],
          });
        }
        return;
      }

      await embedChunksForNote({
        noteId: data.id,
        version,
        items,
        contentHash: result.contentHash,
      });
    },
    [chunkingWorkerApi, embedChunksForNote],
  );

  const schedule = useCallback(
    (data: EmbeddingNoteData, delayMs = 1000) => {
      const nextVersion = (versionsRef.current.get(data.id) ?? 0) + 1;
      versionsRef.current.set(data.id, nextVersion);
      latestVersionRef.current.set(data.id, nextVersion);

      const existing = timersRef.current.get(data.id);
      if (existing) window.clearTimeout(existing);

      const timer = window.setTimeout(() => {
        void runChunkingAndIndexing(data, nextVersion);
      }, delayMs);

      timersRef.current.set(data.id, timer);
    },
    [runChunkingAndIndexing],
  );

  const flush = useCallback(
    (data: EmbeddingNoteData) => {
      const nextVersion = (versionsRef.current.get(data.id) ?? 0) + 1;
      versionsRef.current.set(data.id, nextVersion);
      latestVersionRef.current.set(data.id, nextVersion);

      const existing = timersRef.current.get(data.id);
      if (existing) window.clearTimeout(existing);

      void runChunkingAndIndexing(data, nextVersion);
    },
    [runChunkingAndIndexing],
  );

  const embedQueryFn = useCallback(
    async (text: string, timeoutMs = 30_000) => {
      const normalized = text.trim();
      if (!normalized) throw new Error("Query cannot be empty");

      const version = queryVersionRef.current + 1;
      queryVersionRef.current = version;

      const allowFallback = settings.embeddingHost === "allow-fallback";

      const performFallback = async () => {
        const res = await embedQueryOnServer(normalized);
        if (!res.ok) throw new Error(res.message);
        return Float32Array.from(res.vector);
      };

      const callLocal = async () => {
        if (!embeddingWorkerApi) {
          throw new Error("Embedding worker is not available");
        }

        const res = await withTimeout(
          embeddingWorkerApi.embedQuery({ version, text: normalized }),
          timeoutMs,
          `Embedding query timed out after ${timeoutMs}ms.`,
        );

        if (res === null) {
          // Another embedQuery call started after this one.
          // This is an expected cancellation signal; callers should ignore it.
          throw new DOMException(
            "Embedding query was superseded.",
            "AbortError",
          );
        }

        return new Float32Array(res.vectorBuffer);
      };

      try {
        return await callLocal();
      } catch (error: unknown) {
        if (isSupersededQueryError(error)) {
          throw error;
        }

        const message = getErrorMessage(error);

        await db.localEmbeddingErrors.add({
          id: crypto.randomUUID(),
          type: "EMBED_QUERY",
          message,
          timestamp: new Date(),
        });

        if (allowFallback && navigator.onLine) {
          try {
            const fallback = await performFallback();

            showEmbeddingErrorToast({
              allowFallback,
              performFallback: () => {
                void performFallback();
              },
            });

            return fallback;
          } catch {
            // fall through
          }
        }

        showEmbeddingErrorToast({
          allowFallback,
          performFallback: () => {
            void performFallback();
          },
        });
        throw new Error(message);
      }
    },
    [
      embeddingWorkerApi,
      getErrorMessage,
      isSupersededQueryError,
      settings.embeddingHost,
      showEmbeddingErrorToast,
    ],
  );

  const contextValue = useMemo<EmbedderContextValue>(() => {
    const workerIsReady =
      embeddingWorkerApi !== null && !!modelDownloadState?.isReady;
    const serverIsReady = navigator.onLine;
    const isReady =
      {
        "local-only": workerIsReady,
        "allow-fallback": workerIsReady || serverIsReady,
      }[settings.embeddingHost] || false;

    return {
      modelDownloadState,
      modelId,
      schedule,
      flush,
      embedQuery: embedQueryFn,
      isReady,
    };
  }, [
    embedQueryFn,
    embeddingWorkerApi,
    flush,
    modelDownloadState,
    schedule,
    settings.embeddingHost,
  ]);

  const isReady = contextValue.isReady;

  // Housekeeping once per ready transition: purge old trash, drop vectors from
  // other models, and (re)index notes written while the model was unavailable
  // or restored from trash. runChunkingAndIndexing skips up-to-date notes.
  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const timers: number[] = [];

    (async () => {
      try {
        await purgeDeletedNotes();
        await dropEmbeddingsForOtherModels(modelId);
        const notes = await db.notes.where("deleted").equals(0).toArray();
        if (cancelled) return;
        notes.forEach((note, i) => {
          timers.push(
            window.setTimeout(
              () => schedule({ id: note.id, content: note.content }, 0),
              i * 200,
            ),
          );
        });
      } catch (error) {
        console.error("Embedding backfill failed:", error);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [isReady, schedule]);

  return (
    <EmbedderContext.Provider value={contextValue}>
      {children}
    </EmbedderContext.Provider>
  );
}

export function useEmbedder() {
  return use(EmbedderContext);
}
