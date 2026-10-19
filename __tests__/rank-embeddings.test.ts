import { describe, expect, it } from "vitest";

import { rankEmbeddings } from "@/lib/rank-embeddings";

const row = (noteId: string, chunkId: string, v: number[]) => ({
  noteId,
  chunkId,
  vectorBuffer: new Float32Array(v).buffer,
});

describe("rankEmbeddings", () => {
  const q = new Float32Array([1, 0]);

  it("orders by score and keeps the best chunk per note", () => {
    const out = rankEmbeddings(
      q,
      [
        row("a", "a1", [0.2, 0.9]),
        row("a", "a2", [0.9, 0.1]),
        row("b", "b1", [0.5, 0.5]),
        row("c", "c1", [1, 0]),
      ],
      10,
    );
    expect(out.map((m) => m.chunkId)).toEqual(["c1", "a2", "b1"]);
  });

  it("respects topK and skips bad rows and disallowed notes", () => {
    const out = rankEmbeddings(
      q,
      [
        row("a", "a1", [1, 0]),
        row("b", "b1", [0.9, 0]),
        row("c", "c1", [0.8, 0]),
        row("d", "d1", [1, 0, 0]), // dimension mismatch
        { noteId: "e", chunkId: "e1", vectorBuffer: new ArrayBuffer(0) },
        row("f", "f1", [NaN, 0]),
      ],
      2,
      2,
      (id) => id !== "a",
    );
    expect(out.map((m) => m.noteId)).toEqual(["b", "c"]);
  });

  it("returns nothing for an empty query", () => {
    expect(
      rankEmbeddings(new Float32Array(0), [row("a", "a1", [1])], 5),
    ).toEqual([]);
  });

  it("scans 2,000 notes x 3 chunks quickly", () => {
    const dim = 384;
    const rows = Array.from({ length: 6000 }, (_, i) => {
      const v = new Float32Array(dim).map(() => Math.random() - 0.5);
      return {
        noteId: `n${i % 2000}`,
        chunkId: `c${i}`,
        vectorBuffer: v.buffer,
      };
    });
    const query = new Float32Array(dim).map(() => Math.random());
    const t = performance.now();
    const out = rankEmbeddings(query, rows, 12);
    const ms = performance.now() - t;
    expect(out).toHaveLength(12);
    console.info(`rankEmbeddings 6000x${dim}: ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(2000);
  });
});
