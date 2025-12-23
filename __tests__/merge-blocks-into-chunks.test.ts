import { describe, expect, it } from "vitest";

import { mergeBlocksIntoChunks } from "../src/lib/merge-blocks-into-chunks";

describe("mergeBlocksIntoChunks", () => {
  it("merges consecutive blocks while staying under the target size", () => {
    const result = mergeBlocksIntoChunks(["alpha", "beta", "gamma"], 30, 100);

    expect(result).toEqual(["alpha\n\nbeta\n\ngamma"]);
  });

  it("flushes the buffer when candidate exceeds the target and buffer meets the minimum size", () => {
    const result = mergeBlocksIntoChunks(["aaa", "bbb", "cccccccc"], 12, 10);

    expect(result).toEqual(["aaa\n\nbbb", "cccccccc"]);
  });

  it("splits blocks larger than the maximum size into slices", () => {
    const result = mergeBlocksIntoChunks(["x".repeat(25)], 20, 10);

    expect(result).toEqual(["x".repeat(10), "x".repeat(10), "x".repeat(5)]);
  });

  it("returns empty array when no blocks are provided", () => {
    expect(mergeBlocksIntoChunks([], 15, 10)).toEqual([]);
  });

  it("flushes the buffer before splitting oversized block", () => {
    const result = mergeBlocksIntoChunks(
      ["aa", "bb", "c".repeat(12), "dd"],
      7,
      5,
    );

    expect(result).toEqual([
      "aa\n\nbb",
      "c".repeat(5),
      "c".repeat(5),
      "c".repeat(2),
      "dd",
    ]);
  });

  it("keeps blocks larger than target but within max intact", () => {
    const result = mergeBlocksIntoChunks(["foo", "1234567890", "bar"], 5, 10);

    expect(result).toEqual(["foo", "1234567890", "bar"]);
  });
});
