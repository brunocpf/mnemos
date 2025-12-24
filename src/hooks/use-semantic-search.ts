"use client";

import { useEffect, useRef, useState } from "react";

import { db } from "@/client-data/db";
import { dotProduct } from "@/lib/dot-product";
import { topKPush } from "@/lib/top-k";
import { useEmbedderService } from "@/providers/embedder-service-provider";

const DEFAULT_TOP_K = 12;
const DEFAULT_OVERSAMPLING_FACTOR = 2;

export type SemanticMatch = {
  noteId: string;
  chunkId: string;
  excerpt: string;
  score: number;
};

export type UseSemanticSearchOptions = {
  topK?: number;
  oversamplingFactor?: number;
  debounceMs?: number;
};

export function useSemanticSearch(
  query: string,
  options: UseSemanticSearchOptions = {},
) {
  const { embedQuery, getModelId } = useEmbedderService();
  const [matches, setMatches] = useState<SemanticMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const latestSearchRef = useRef(0);
  const topK = options.topK ?? DEFAULT_TOP_K;
  const oversamplingFactor =
    options.oversamplingFactor ?? DEFAULT_OVERSAMPLING_FACTOR;

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setMatches([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const searchId = latestSearchRef.current + 1;
    latestSearchRef.current = searchId;

    async function runSearch() {
      setIsSearching(true);
      console.log("Running semantic search for query:", {
        normalizedQuery,
        timestamp: new Date(),
      });
      setError(null);

      try {
        const modelId = getModelId();
        const queryVector = await embedQuery(normalizedQuery);
        if (cancelled || latestSearchRef.current !== searchId) return;

        const embeddings = await db.embeddings
          .where("modelId")
          .equals(modelId)
          .toArray();

        if (cancelled || latestSearchRef.current !== searchId) return;

        const chunkCandidates: Omit<SemanticMatch, "excerpt">[] = [];

        for (const embedding of embeddings) {
          if (cancelled || latestSearchRef.current !== searchId) return;

          const { vectorBuffer } = embedding;
          if (!vectorBuffer || vectorBuffer.byteLength === 0) continue;

          const chunkVector = new Float32Array(vectorBuffer);

          if (
            chunkVector.length === 0 ||
            queryVector.length === 0 ||
            chunkVector.length !== queryVector.length
          )
            continue;

          const score = dotProduct(queryVector, chunkVector);
          if (!Number.isFinite(score)) continue;

          topKPush(
            chunkCandidates,
            {
              noteId: embedding.noteId,
              chunkId: embedding.chunkId,
              score,
            },
            topK * oversamplingFactor,
          );
        }

        const candidatesWithExcerpts = await Promise.all(
          chunkCandidates.map(async (candidate) => {
            const chunk = await db.chunks.get(candidate.chunkId);
            const excerpt = chunk?.text.slice(0, 200) ?? "";
            return {
              ...candidate,
              excerpt,
            };
          }),
        );

        const bestByNote = new Map<string, SemanticMatch>();
        for (const candidate of candidatesWithExcerpts) {
          const prev = bestByNote.get(candidate.noteId);
          if (!prev || candidate.score > prev.score) {
            bestByNote.set(candidate.noteId, candidate);
          }
        }

        const orderedMatches = Array.from(bestByNote.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);

        if (cancelled || latestSearchRef.current !== searchId) return;

        setMatches(orderedMatches);
      } catch (err) {
        if (cancelled || latestSearchRef.current !== searchId) return;

        const error =
          err instanceof Error
            ? err
            : new Error("Failed to execute semantic search.");
        setMatches([]);
        setError(error);
      } finally {
        if (cancelled || latestSearchRef.current !== searchId) return;
        console.log("Semantic search completed or cancelled for query:", {
          normalizedQuery,
          timestamp: new Date(),
        });
        setIsSearching(false);
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [embedQuery, getModelId, oversamplingFactor, query, topK]);

  return {
    matches,
    isSearching,
    error,
  };
}
