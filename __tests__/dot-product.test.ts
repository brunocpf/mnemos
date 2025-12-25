import { describe, expect, it } from "vitest";

import { dotProduct } from "../src/lib/dot-product";

describe("dotProduct", () => {
  it("returns 0 for orthogonal vectors", () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 2, 0]);
    expect(dotProduct(a, b)).toBe(0);
  });

  it("handles negative values", () => {
    const a = new Float32Array([2, -3, 5]);
    const b = new Float32Array([-4, 6, 1]);
    expect(dotProduct(a, b)).toBe(-8);
  });

  it("works with long vectors", () => {
    const a = new Float32Array([1, 2, 3, 4, 5]);
    const b = new Float32Array([5, 4, 3, 2, 1]);
    expect(dotProduct(a, b)).toBe(35);
  });
});
