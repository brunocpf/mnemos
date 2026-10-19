import { describe, expect, it } from "vitest";

import { getMarkdownBlocks } from "@/lib/get-markdown-blocks";
import { mergeBlocksIntoChunks } from "@/lib/merge-blocks-into-chunks";
import { sha256 } from "@/lib/sha256";

const chunk = (md: string) =>
  mergeBlocksIntoChunks(getMarkdownBlocks(md), 800, 1200);

describe("chunking stability", () => {
  const para = (n: number) => `Paragraph ${n}. ` + "word ".repeat(60);
  const doc = Array.from({ length: 12 }, (_, i) => para(i)).join("\n\n");

  it("is deterministic", async () => {
    const a = await Promise.all(chunk(doc).map(sha256));
    const b = await Promise.all(chunk(doc).map(sha256));
    expect(a).toEqual(b);
  });

  it("editing the tail leaves earlier chunk hashes (ids) untouched", async () => {
    const a = await Promise.all(chunk(doc).map(sha256));
    const b = await Promise.all(
      chunk(doc + "\n\nA new closing thought.").map(sha256),
    );
    expect(a.length).toBeGreaterThan(1);
    expect(b.slice(0, a.length - 1)).toEqual(a.slice(0, a.length - 1));
  });
});
