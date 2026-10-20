import { appendTitleToContent } from "./append-title-to-content";

/**
 * The text that gets chunked, hashed and embedded for a note. The title is part
 * of it, so renaming a note changes the hash and triggers a re-embed.
 */
export function buildEmbeddingBody(title: string | undefined, content: string) {
  const trimmed = title?.trim();
  return trimmed ? appendTitleToContent(trimmed, content) : content;
}
