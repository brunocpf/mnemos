import { describe, expect, it } from "vitest";

import { topKPush } from "../src/lib/top-k-push";

type Item = { id: string; score: number };

describe("topKPush", () => {
  it("keeps the array sorted in descending order while filling up", () => {
    const arr: Item[] = [];

    topKPush(arr, { id: "a", score: 0.4 }, 3);
    topKPush(arr, { id: "b", score: 0.9 }, 3);
    topKPush(arr, { id: "c", score: 0.5 }, 3);

    expect(arr.map((item) => item.id)).toEqual(["b", "c", "a"]);
    expect(arr.map((item) => item.score)).toEqual([0.9, 0.5, 0.4]);
  });

  it("ignores candidates whose score is not high enough", () => {
    const arr: Item[] = [
      { id: "a", score: 0.8 },
      { id: "b", score: 0.7 },
      { id: "c", score: 0.6 },
    ];

    topKPush(arr, { id: "d", score: 0.5 }, 3);
    expect(arr.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("replaces the lowest entry when the new score is better", () => {
    const arr: Item[] = [
      { id: "a", score: 0.9 },
      { id: "b", score: 0.6 },
      { id: "c", score: 0.4 },
    ];

    topKPush(arr, { id: "d", score: 0.7 }, 3);

    expect(arr.map((item) => item.id)).toEqual(["a", "d", "b"]);
    expect(arr.map((item) => item.score)).toEqual([0.9, 0.7, 0.6]);
  });
});
