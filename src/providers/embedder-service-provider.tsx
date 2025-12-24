"use client";

import { createContext, use, useCallback, useEffect, useRef } from "react";

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
}>({
  schedule: () => {},
  flush: () => {},
  embedQuery: () => Promise.resolve(new Float32Array()),
});

export function EmbedderServiceProvider({ children }: React.PropsWithChildren) {
  const embedderServiceRef = useRef<EmbedderService | null>(null);

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

    embedderServiceRef.current = new EmbedderService(
      db,
      chunkingClient,
      embeddingClient,
    );

    return () => {
      embedderServiceRef.current?.dispose();
      chunkingWorker.terminate();
      embeddingWorker.terminate();
      embedderServiceRef.current = null;
    };
  }, []);

  const schedule = useCallback(
    (data: { id: string; title?: string; content: string }, delayMs = 1000) => {
      if (embedderServiceRef.current === null) {
        throw new Error("EmbedderService is not initialized");
      }

      embedderServiceRef.current.schedule(data, delayMs);
    },
    [],
  );

  const flush = useCallback(
    (data: { id: string; title?: string; content: string }) => {
      if (embedderServiceRef.current === null) {
        throw new Error("EmbedderService is not initialized");
      }

      embedderServiceRef.current.flush(data);
    },
    [],
  );

  const embedQuery = useCallback((text: string, timeoutMs = 30000) => {
    if (embedderServiceRef.current === null) {
      throw new Error("EmbedderService is not initialized");
    }

    return embedderServiceRef.current.embedQuery(text, timeoutMs);
  }, []);

  return (
    <EmbedderServiceContext.Provider value={{ schedule, flush, embedQuery }}>
      {children}
    </EmbedderServiceContext.Provider>
  );
}

export function useEmbedderService() {
  return use(EmbedderServiceContext);
}
