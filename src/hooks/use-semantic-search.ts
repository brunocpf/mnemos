"use client";

import { useEffect, useRef, useState } from "react";

import { db } from "@/client-data/db";
import { stripTitleFromChunk } from "@/lib/append-title-to-content";
import { rankEmbeddings } from "@/lib/rank-embeddings";
import {
  createHighlightSnippet,
  getHighlightTerms,
  type SearchHighlightPayload,
} from "@/lib/search-highlight";
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

export type UseSemanticSearchOptions = {
  topK?: number;
  oversamplingFactor?: number;
  debounceMs?: number;
};

export function useSemanticSearch(
  query: string,
  options: UseSemanticSearchOptions = {},
) {
  const { embedQuery, modelId, isReady } = useEmbedder();
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
      /* eslint-disable react-hooks/set-state-in-effect */
      setMatches([]);
      setIsSearching(false);
      setError(null);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    const highlightTerms = getHighlightTerms(normalizedQuery);

    let cancelled = false;
    const searchId = latestSearchRef.current + 1;
    latestSearchRef.current = searchId;

    async function runSearch() {
      if (!isReady) {
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        if (!modelId) {
          throw new Error("Embedding model is not ready.");
        }
        const queryVector = await embedQuery(normalizedQuery);
        if (cancelled || latestSearchRef.current !== searchId) return;

        const embeddings = await db.embeddings
          .where("modelId")
          .equals(modelId)
          .toArray();

        if (cancelled || latestSearchRef.current !== searchId) return;

        const liveNoteIds = new Set(
          await db.notes.where("deleted").equals(0).primaryKeys(),
        );
        if (cancelled || latestSearchRef.current !== searchId) return;

        const orderedMatches = rankEmbeddings(
          queryVector,
          embeddings,
          topK,
          oversamplingFactor,
          (noteId) => liveNoteIds.has(noteId),
        );

        const chunkIds = orderedMatches.map((match) => match.chunkId);
        const chunks = await db.chunks.bulkGet(chunkIds);
        const chunkTextById = new Map<string, string>();
        chunks.forEach((chunk, index) => {
          if (chunk) {
            chunkTextById.set(
              chunkIds[index],
              stripTitleFromChunk(chunk.text ?? ""),
            );
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
        if (
          err instanceof DOMException &&
          (err.name === "AbortError" ||
            err.message === "Embedding query was superseded.")
        ) {
          return;
        }

        console.error("Semantic search failed:", err);
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
  }, [query, embedQuery, modelId, oversamplingFactor, topK, isReady]);

  return {
    matches,
    isSearching,
    error,
    isReady,
  };
}
