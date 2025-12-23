export function getMarkdownBlocks(md: string) {
  const lines = md.split("\n");
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line) && current.length > 0) {
      sections.push(current.join("\n").trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current.join("\n").trim());

  const blocks: string[] = [];
  for (const section of sections) {
    const paragraphs = section
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    blocks.push(...paragraphs);
  }

  return blocks;
}
