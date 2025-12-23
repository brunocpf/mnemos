export function mergeBlocksIntoChunks(
  blocks: string[],
  targetBlockSize: number,
  maxChars: number,
) {
  const merged: string[] = [];
  let buffer = "";

  for (const block of blocks) {
    const candidate = buffer ? `${buffer}\n\n${block}` : block;

    if (candidate.length <= targetBlockSize) {
      buffer = candidate;
      continue;
    }

    if (buffer) {
      merged.push(buffer);
      buffer = "";
    }

    if (block.length > maxChars) {
      for (let i = 0; i < block.length; i += maxChars) {
        merged.push(block.slice(i, i + maxChars));
      }
    } else {
      buffer = block;
    }
  }
  if (buffer) merged.push(buffer);

  return merged;
}
