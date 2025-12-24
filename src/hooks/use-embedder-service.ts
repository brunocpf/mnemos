"use client";
import { useCallback, useEffect, useRef } from "react";

import { db } from "@/client-data/db";
import { ChunkingClient } from "@/services/chunking-client";
import { EmbedderService } from "@/services/embedder-service";
import { EmbeddingClient } from "@/services/embedding-client";

export function useEmbedderService() {
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

  return {
    schedule,
    flush,
  };
}
