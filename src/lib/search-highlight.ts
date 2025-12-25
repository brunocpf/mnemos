import markdownToTxt from "markdown-to-txt";
import z from "zod";

const highlightRangeSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
});

export type HighlightRange = z.infer<typeof highlightRangeSchema>;

const searchHighlightSchema = z.object({
  noteId: z.string(),
  chunkId: z.string(),
  snippet: z.string(),
  highlights: z.array(highlightRangeSchema),
  leadingEllipsis: z.boolean(),
  trailingEllipsis: z.boolean(),
  terms: z.array(z.string()),
});

export type SearchHighlightPayload = z.infer<typeof searchHighlightSchema>;

export function encodeSearchHighlight(payload: SearchHighlightPayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeSearchHighlight(value: string) {
  const searchHighlightParsed = searchHighlightSchema.safeParse(
    JSON.parse(decodeURIComponent(value)),
  );

  if (searchHighlightParsed.success) {
    return searchHighlightParsed.data;
  } else {
    return null;
  }
}

export function getHighlightTerms(query: string) {
  const normalized = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}]+/gu, ""))
    .filter(Boolean);

  if (normalized.length === 0 && query.trim()) {
    normalized.push(query.trim().toLowerCase());
  }

  return Array.from(new Set(normalized));
}

export function createHighlightSnippet(
  text: string,
  terms: string[],
  options: { maxLength?: number } = {},
) {
  const maxLength = options.maxLength ?? 240;
  const content = markdownToTxt(text) ?? "";

  if (!content) {
    return {
      snippet: "",
      highlights: [],
      leadingEllipsis: false,
      trailingEllipsis: false,
    };
  }

  const normalizedTerms = terms
    .map((term) => term.toLowerCase())
    .filter(Boolean);
  const lowerContent = content.toLowerCase();

  const ranges: HighlightRange[] = [];

  for (const term of normalizedTerms) {
    let idx = lowerContent.indexOf(term);
    while (idx !== -1) {
      ranges.push({ start: idx, end: idx + term.length });
      idx = lowerContent.indexOf(term, idx + term.length);
    }
  }

  ranges.sort((a, b) => a.start - b.start);

  const merged: HighlightRange[] = [];
  for (const range of ranges) {
    const prev = merged.at(-1);
    if (!prev || range.start > prev.end) {
      merged.push({ ...range });
    } else {
      prev.end = Math.max(prev.end, range.end);
    }
  }

  const snippetStart = merged.length
    ? Math.max(0, merged[0].start - Math.floor(maxLength * 0.25))
    : 0;
  const snippetEnd = Math.min(content.length, snippetStart + maxLength);

  const snippet = content.slice(snippetStart, snippetEnd);

  const adjustedHighlights = merged
    .map(({ start, end }) => ({
      start: start - snippetStart,
      end: end - snippetStart,
    }))
    .filter((range) => range.end > 0 && range.start < snippet.length)
    .map((range) => ({
      start: Math.max(0, range.start),
      end: Math.min(snippet.length, range.end),
    }));

  return {
    snippet,
    highlights: adjustedHighlights,
    leadingEllipsis: snippetStart > 0,
    trailingEllipsis: snippetEnd < content.length,
  };
}
