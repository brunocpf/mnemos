export function appendTitleToContent(title: string, content: string) {
  return `Title: ${title}\n\n---\n\n${content}`;
}

const TITLE_PREFIX = /^Title: [^\n]*\n\n---\n\n/;

/** Removes the title header added by `appendTitleToContent`, if present. */
export function stripTitleFromChunk(text: string) {
  return text.replace(TITLE_PREFIX, "");
}
