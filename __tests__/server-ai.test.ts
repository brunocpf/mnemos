import { describe, expect, it } from "vitest";

import {
  clientKeyFromHeaders,
  coerceVector,
  createRateLimiter,
  embedChunksSchema,
  embedQuerySchema,
  l2Normalize,
  LIMITS,
  meanPool,
  randomSalt,
  summarizeSchema,
} from "../src/lib/server-ai";

describe("meanPool", () => {
  it("averages token embeddings per dimension", () => {
    expect(
      meanPool([
        [1, 2],
        [3, 4],
      ]),
    ).toEqual([2, 3]);
  });

  it("returns [] for empty input or zero dims", () => {
    expect(meanPool([])).toEqual([]);
    expect(meanPool([[]])).toEqual([]);
  });
});

describe("l2Normalize", () => {
  it("produces a unit vector", () => {
    const out = l2Normalize([3, 4]);
    expect(out[0]).toBeCloseTo(0.6);
    expect(out[1]).toBeCloseTo(0.8);
  });

  it("returns the zero vector unchanged", () => {
    expect(l2Normalize([0, 0])).toEqual([0, 0]);
  });
});

describe("coerceVector", () => {
  it("normalizes a pooled vector", () => {
    const out = coerceVector([3, 4]);
    expect(out[0]).toBeCloseTo(0.6);
  });

  it("mean-pools then normalizes token embeddings", () => {
    const out = coerceVector([
      [2, 0],
      [4, 0],
    ]);
    expect(out).toEqual([1, 0]);
  });

  it("returns [] for an empty array", () => {
    expect(coerceVector([])).toEqual([]);
  });

  it("throws on non-arrays and unexpected shapes", () => {
    expect(() => coerceVector("x")).toThrow();
    expect(() => coerceVector(null)).toThrow();
    expect(() => coerceVector([["a"]])).toThrow();
  });
});

describe("validation schemas", () => {
  it("accepts valid chunks", () => {
    expect(
      embedChunksSchema.safeParse([{ chunkId: "a", text: "hi" }]).success,
    ).toBe(true);
  });

  it("rejects empty, oversized and malformed chunk lists", () => {
    expect(embedChunksSchema.safeParse([]).success).toBe(false);
    const tooMany = Array.from({ length: LIMITS.maxChunks + 1 }, (_, i) => ({
      chunkId: String(i),
      text: "x",
    }));
    expect(embedChunksSchema.safeParse(tooMany).success).toBe(false);
    expect(
      embedChunksSchema.safeParse([
        { chunkId: "a", text: "x".repeat(LIMITS.maxCharsPerChunk + 1) },
      ]).success,
    ).toBe(false);
    expect(embedChunksSchema.safeParse([{ chunkId: "a" }]).success).toBe(false);
    expect(embedChunksSchema.safeParse("nope").success).toBe(false);
  });

  it("limits query and summary length", () => {
    expect(embedQuerySchema.safeParse("  ").success).toBe(false);
    expect(embedQuerySchema.safeParse("q").success).toBe(true);
    expect(
      summarizeSchema.safeParse("x".repeat(LIMITS.maxSummaryChars)).success,
    ).toBe(true);
    expect(
      summarizeSchema.safeParse("x".repeat(LIMITS.maxSummaryChars + 1)).success,
    ).toBe(false);
    expect(summarizeSchema.safeParse(42).success).toBe(false);
  });
});

describe("createRateLimiter", () => {
  it("blocks after max hits and resets after the window", () => {
    const check = createRateLimiter({ max: 2, windowMs: 1000 });
    expect(check("ip", 0).allowed).toBe(true);
    expect(check("ip", 1).allowed).toBe(true);
    const blocked = check("ip", 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.allowed === false && blocked.retryAfterSeconds).toBe(1);
    expect(check("other", 2).allowed).toBe(true);
    expect(check("ip", 1001).allowed).toBe(true);
  });
});

describe("clientKeyFromHeaders", () => {
  const h = (m: Record<string, string>) => ({
    get: (n: string) => m[n] ?? null,
  });
  it("prefers the first x-forwarded-for entry", () => {
    expect(
      clientKeyFromHeaders(h({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })),
    ).toBe("1.1.1.1");
    expect(clientKeyFromHeaders(h({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
    expect(clientKeyFromHeaders(h({}))).toBe("unknown");
  });
});

describe("randomSalt", () => {
  it("is unique and long", () => {
    const a = randomSalt();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(randomSalt()).not.toBe(a);
  });
});
