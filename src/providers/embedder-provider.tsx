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
import { embeddingQueue } from "@/client-data/embedding-queue";
import {
  dropEmbeddingsForOtherModels,
  purgeDeletedNotes,
} from "@/client-data/notes-dal";
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

const BACKFILL_STAGGER_MS = 200;

const SERVER_EMBED_BATCH_SIZE = LIMITS.maxChunks;

export type EmbeddingNoteData = {
  id: string;
  title?: string;
  content: string;
};

export interface EmbedderContextValue {
  schedule: (data: EmbeddingNoteData, delayMs?: number) => void;
  flush: (data: EmbeddingNoteData) => void;
  /**
   * Queues chunking and embedding for notes written outside the editor (e.g.
   * an import). Up-to-date notes are skipped; if the model isn't ready yet the
   * once-per-ready backfill picks them up instead.
   */
  reindexNotes: (noteIds: string[]) => void;
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
  reindexNotes: () => {
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

  // Latest settings for the long-lived queue runner, which must not be
  // re-created (and so interrupted) whenever a setting changes.
  const embeddingHostRef = useRef(settings.embeddingHost);
  const forceFallbackRef = useRef(false);
  const errorToastedRef = useRef(false);
  useEffect(() => {
    embeddingHostRef.current = settings.embeddingHost;
  }, [settings.embeddingHost]);

  const embedOnServerBatch = useCallback(
    async (items: { chunkId: string; text: string }[]) => {
      // The server caps the number of chunks per request.
      const vectors: { chunkId: string; vectorBuffer: ArrayBuffer }[] = [];
      for (let i = 0; i < items.length; i += SERVER_EMBED_BATCH_SIZE) {
        const res = await embedOnServer(
          items.slice(i, i + SERVER_EMBED_BATCH_SIZE),
        );
        if (!res.ok) throw new Error(res.message);
        vectors.push(
          ...res.vectors.map((v) => ({
            chunkId: v.chunkId,
            vectorBuffer: Float32Array.from(v.vectorArray).buffer,
          })),
        );
      }
      return vectors;
    },
    [],
  );

  // Embeds one queue batch: on-device first, then (if allowed) the server.
  // Throwing hands the batch back to the queue, which retries with backoff.
  const embedQueueBatch = useCallback(
    async (items: { chunkId: string; text: string }[]) => {
      if (!embeddingWorkerApi) {
        throw new Error("Embedding worker is not available");
      }

      const allowFallback = () =>
        forceFallbackRef.current ||
        embeddingHostRef.current === "allow-fallback";

      try {
        const result = await embeddingWorkerApi.embedBatch({ items });
        errorToastedRef.current = false;
        return result.vectors;
      } catch (error: unknown) {
        const message = getErrorMessage(error);

        await db.localEmbeddingErrors.add({
          id: crypto.randomUUID(),
          type: "EMBED_CHUNKS",
          message,
          timestamp: new Date(),
        });

        if (allowFallback() && navigator.onLine) {
          try {
            const vectors = await embedOnServerBatch(items);
            errorToastedRef.current = false;
            return vectors;
          } catch (fallbackError: unknown) {
            console.error("Server-side embedding failed", fallbackError);
          }
        }

        // Once per failure streak, not once per retry.
        if (!errorToastedRef.current) {
          errorToastedRef.current = true;
          showEmbeddingErrorToast({
            allowFallback: allowFallback(),
            performFallback: () => {
              forceFallbackRef.current = true;
              embeddingQueue.kick();
            },
          });
        }
        throw error;
      }
    },
    [
      embedOnServerBatch,
      embeddingWorkerApi,
      getErrorMessage,
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

      // Jobs are persisted, so the work survives navigation and reloads; the
      // app-scoped queue picks them up (or resumes them on the next start).
      await embeddingQueue.enqueueNote({
        noteId: data.id,
        modelId: currentModelId,
        contentHash: result.contentHash,
        chunks: result.chunks,
      });
    },
    [chunkingWorkerApi],
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

  const reindexNotes = useCallback(
    (noteIds: string[]) => {
      noteIds.forEach((id, i) => {
        window.setTimeout(async () => {
          const note = await db.notes.get(id);
          if (note && !note.deleted) {
            schedule({ id, content: note.content }, 0);
          }
        }, i * BACKFILL_STAGGER_MS);
      });
    },
    [schedule],
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
      reindexNotes,
      embedQuery: embedQueryFn,
      isReady,
    };
  }, [
    embedQueryFn,
    embeddingWorkerApi,
    flush,
    modelDownloadState,
    reindexNotes,
    schedule,
    settings.embeddingHost,
  ]);

  const isReady = contextValue.isReady;

  // Runs the persistent embedding queue for the lifetime of the app, resuming
  // jobs left over from a previous session. It is not tied to any page.
  const embedQueueBatchRef = useRef(embedQueueBatch);
  useEffect(() => {
    embedQueueBatchRef.current = embedQueueBatch;
  }, [embedQueueBatch]);

  useEffect(() => {
    if (!isReady || !embeddingWorkerApi) return;
    // Settings changes must not restart the queue, so go through a ref.
    void embeddingQueue.start({
      modelId,
      embed: (items) => embedQueueBatchRef.current(items),
    });
    const onOnline = () => embeddingQueue.kick();
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      embeddingQueue.stop();
    };
  }, [embeddingWorkerApi, isReady]);

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
              i * BACKFILL_STAGGER_MS,
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
