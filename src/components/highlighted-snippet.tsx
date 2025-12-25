import { HighlightRange } from "@/lib/search-highlight";
import { cn } from "@/lib/utils";

interface HighlightedSnippetProps {
  text: string;
  highlights: HighlightRange[];
  leadingEllipsis?: boolean;
  trailingEllipsis?: boolean;
  className?: string;
}

export function HighlightedSnippet({
  text,
  highlights,
  leadingEllipsis = false,
  trailingEllipsis = false,
  className,
}: HighlightedSnippetProps) {
  const segments: { value: string; isHighlight: boolean; key: string }[] = [];
  const ordered = [...highlights]
    .map((range) => ({
      start: Math.max(0, Math.min(range.start, text.length)),
      end: Math.max(0, Math.min(range.end, text.length)),
    }))
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start);

  let cursor = 0;

  ordered.forEach((range, index) => {
    if (range.start > cursor) {
      segments.push({
        value: text.slice(cursor, range.start),
        isHighlight: false,
        key: `plain-${index}-${cursor}`,
      });
    }

    segments.push({
      value: text.slice(range.start, range.end),
      isHighlight: true,
      key: `highlight-${index}-${range.start}`,
    });

    cursor = range.end;
  });

  if (cursor < text.length) {
    segments.push({
      value: text.slice(cursor),
      isHighlight: false,
      key: `plain-tail-${cursor}`,
    });
  }

  if (!segments.length) {
    segments.push({ value: text, isHighlight: false, key: "plain-full" });
  }

  return (
    <span className={cn("inline text-sm", className)}>
      {leadingEllipsis && <span aria-hidden="true">... </span>}
      {segments.map((segment) =>
        segment.isHighlight ? (
          <mark
            key={segment.key}
            className="search-highlight rounded-sm px-1 py-0.5"
          >
            {segment.value}
          </mark>
        ) : (
          <span key={segment.key}>{segment.value}</span>
        ),
      )}
      {trailingEllipsis && <span aria-hidden="true"> ...</span>}
    </span>
  );
}
