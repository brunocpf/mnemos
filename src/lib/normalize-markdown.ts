export function normalizeMarkdown(md: string): string {
  return md.replaceAll("\r\n", "\n").trimEnd();
}
