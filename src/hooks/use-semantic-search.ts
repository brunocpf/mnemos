"use client";

import { useEffect, useRef, useState } from "react";

import { db } from "@/client-data/db";
import { dotProduct } from "@/lib/dot-product";
import {
  createHighlightSnippet,
  getHighlightTerms,
  type SearchHighlightPayload,
} from "@/lib/search-highlight";
import { topKPush } from "@/lib/top-k-push";
import { useEmbedder } from "@/providers/embedder-provider";

const DEFAULT_TOP_K = process.env.NEXT_PUBLIC_DEFAULT_SEMANTIC_SEARCH_TOP_K
  ? parseInt(process.env.NEXT_PUBLIC_DEFAULT_SEMANTIC_SEARCH_TOP_K, 10)
  : 12;
const DEFAULT_OVERSAMPLING_FACTOR = process.env
  .NEXT_PUBLIC_DEFAULT_SEMANTIC_SEARCH_OVERSAMPLING_FACTOR
  ? parseInt(
      process.env.NEXT_PUBLIC_DEFAULT_SEMANTIC_SEARCH_OVERSAMPLING_FACTOR,
      10,
    )
  : 2;

export type SemanticMatch = SearchHighlightPayload & {
  score: number;
};

type Candidate = Pick<SemanticMatch, "noteId" | "chunkId" | "score">;

export type UseSemanticSearchOptions = {
  topK?: number;
  oversamplingFactor?: number;
  debounceMs?: number;
};

export function useSemanticSearch(
  query: string,
  options: UseSemanticSearchOptions = {},
) {
  const { embedQuery, modelId } = useEmbedder();
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

    const highlightTerms = getHighlightTerms(normalizedQuery);

    let cancelled = false;
    const searchId = latestSearchRef.current + 1;
    latestSearchRef.current = searchId;

    async function runSearch() {
      setIsSearching(true);
      setError(null);

      try {
        if (!modelId) {
          throw new Error("Embedding model is not ready yet.");
        }
        const queryVector = await embedQuery(normalizedQuery);
        if (cancelled || latestSearchRef.current !== searchId) return;

        const embeddings = await db.embeddings
          .where("modelId")
          .equals(modelId)
          .toArray();

        if (cancelled || latestSearchRef.current !== searchId) return;

        const chunkCandidates: Candidate[] = [];

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

        const bestByNote = new Map<string, Candidate>();
        for (const candidate of chunkCandidates) {
          const prev = bestByNote.get(candidate.noteId);
          if (!prev || candidate.score > prev.score) {
            bestByNote.set(candidate.noteId, candidate);
          }
        }

        const orderedMatches = Array.from(bestByNote.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);

        const chunkIds = orderedMatches.map((match) => match.chunkId);
        const chunks = await db.chunks.bulkGet(chunkIds);
        const chunkTextById = new Map<string, string>();
        chunks.forEach((chunk, index) => {
          if (chunk) {
            chunkTextById.set(chunkIds[index], chunk.text ?? "");
          }
        });

        const enrichedMatches = orderedMatches.map((match) => {
          const chunkText = chunkTextById.get(match.chunkId) ?? "";
          const snippetResult = createHighlightSnippet(
            chunkText,
            highlightTerms,
          );

          return {
            ...match,
            snippet:
              snippetResult.snippet.length > 0
                ? snippetResult.snippet
                : chunkText.slice(0, 240),
            highlights: snippetResult.highlights,
            leadingEllipsis: snippetResult.leadingEllipsis,
            trailingEllipsis: snippetResult.trailingEllipsis,
            terms: highlightTerms,
          } satisfies SemanticMatch;
        });

        if (cancelled || latestSearchRef.current !== searchId) return;

        setMatches(enrichedMatches);
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
        setIsSearching(false);
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [query, embedQuery, modelId, oversamplingFactor, topK]);

  return {
    matches,
    isSearching,
    error,
  };
}
