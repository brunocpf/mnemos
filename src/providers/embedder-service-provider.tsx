"use client";

import {
  createContext,
  startTransition,
  use,
  useCallback,
  useEffect,
  useState,
} from "react";

import { db } from "@/client-data/db";
import { ChunkingClient } from "@/services/chunking-client";
import { EmbedderService } from "@/services/embedder-service";
import { EmbeddingClient } from "@/services/embedding-client";

export const EmbedderServiceContext = createContext<{
  schedule: (
    data: { id: string; title?: string; content: string },
    delayMs?: number,
  ) => void;
  flush: (data: { id: string; title?: string; content: string }) => void;
  embedQuery(
    text: string,
    timeoutMs?: number,
  ): Promise<Float32Array<ArrayBufferLike>>;
  getModelId(): string;
}>({
  schedule: () => {},
  flush: () => {},
  embedQuery: () => Promise.resolve(new Float32Array()),
  getModelId: () => "",
});

export function EmbedderServiceProvider({ children }: React.PropsWithChildren) {
  const [embedderService, setEmbedderService] =
    useState<EmbedderService | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return;
    }

    const chunkingWorker = new Worker(
      new URL("@/workers/chunking.worker.ts", import.meta.url),
      { type: "module" },
    );

    const embeddingWorker = new Worker(
      new URL("@/workers/embedding.worker.ts", import.meta.url),
      { type: "module" },
    );

    const chunkingClient = new ChunkingClient(chunkingWorker);
    const embeddingClient = new EmbeddingClient(embeddingWorker, {
      modelId: process.env.NEXT_PUBLIC_CURRENT_EMBEDDING_MODEL_ID,
    });

    let disposed = false;
    const newEmbedderService = new EmbedderService(
      db,
      chunkingClient,
      embeddingClient,
    );

    startTransition(() => {
      if (!disposed) {
        setEmbedderService(newEmbedderService);
      }
    });

    return () => {
      disposed = true;
      chunkingWorker.terminate();
      embeddingWorker.terminate();
      chunkingClient.dispose();
      embeddingClient.dispose();
      newEmbedderService.dispose();
      startTransition(() => void setEmbedderService(null));
    };
  }, []);

  const schedule = useCallback(
    (data: { id: string; title?: string; content: string }, delayMs = 1000) => {
      if (embedderService === null) {
        throw new Error("EmbedderService is not initialized");
      }

      embedderService.schedule(data, delayMs);
    },
    [embedderService],
  );

  const flush = useCallback(
    (data: { id: string; title?: string; content: string }) => {
      if (embedderService === null) {
        throw new Error("EmbedderService is not initialized");
      }

      embedderService.flush(data);
    },
    [embedderService],
  );

  const embedQuery = useCallback(
    (text: string, timeoutMs = 30000) => {
      if (embedderService === null) {
        throw new Error("EmbedderService is not initialized");
      }

      return embedderService.embedQuery(text, timeoutMs);
    },
    [embedderService],
  );

  const getModelId = useCallback(() => {
    if (embedderService === null) {
      throw new Error("EmbedderService is not initialized");
    }

    return embedderService.modelId;
  }, [embedderService]);

  return (
    <EmbedderServiceContext.Provider
      value={{ schedule, flush, embedQuery, getModelId }}
    >
      {children}
    </EmbedderServiceContext.Provider>
  );
}

export function useEmbedderService() {
  return use(EmbedderServiceContext);
}
