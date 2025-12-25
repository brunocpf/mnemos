import { describe, expect, it } from "vitest";

import {
  createHighlightSnippet,
  decodeSearchHighlight,
  encodeSearchHighlight,
  getHighlightTerms,
  type SearchHighlightPayload,
} from "../src/lib/search-highlight";

describe("search highlight serialization", () => {
  it("round-trips encode and decode", () => {
    const payload: SearchHighlightPayload = {
      noteId: "note-1",
      chunkId: "chunk-1",
      snippet: "Snippet text",
      highlights: [{ start: 0, end: 6 }],
      leadingEllipsis: false,
      trailingEllipsis: true,
      terms: ["term"],
    };

    const encoded = encodeSearchHighlight(payload);
    expect(decodeSearchHighlight(encoded)).toEqual(payload);
  });

  it("returns null when payload fails validation", () => {
    const invalidPayload = encodeURIComponent(JSON.stringify({ noteId: 123 }));
    expect(decodeSearchHighlight(invalidPayload)).toBeNull();
  });
});

describe("getHighlightTerms", () => {
  it("normalizes casing, punctuation, and duplicates", () => {
    const terms = getHighlightTerms("Alpha alpha!!! Beta... 123??? Beta");
    expect(terms).toEqual(["alpha", "beta", "123"]);
  });

  it("falls back to the raw query when nothing normalizes", () => {
    expect(getHighlightTerms("***")).toEqual(["***"]);
    expect(getHighlightTerms("   ")).toEqual([]);
  });
});

describe("createHighlightSnippet", () => {
  it("returns a snippet with highlight ranges for every term", () => {
    const text = "Alpha beta alpha gamma";
    const result = createHighlightSnippet(text, ["alpha", "beta"]);

    expect(result.snippet).toBe("Alpha beta alpha gamma");
    expect(result.leadingEllipsis).toBe(false);
    expect(result.trailingEllipsis).toBe(false);
    expect(result.highlights).toHaveLength(3);
    const highlightedText = result.highlights.map(({ start, end }) =>
      result.snippet.slice(start, end).toLowerCase(),
    );
    expect(highlightedText).toEqual(["alpha", "beta", "alpha"]);
  });

  it("strips markdown formatting and handles empty content", () => {
    const markdown = "# Title\n\n**Alpha** body";
    const result = createHighlightSnippet(markdown, ["alpha"], {
      maxLength: 20,
    });
    expect(result.snippet.includes("#")).toBe(false);
    expect(result.snippet.startsWith("Title")).toBe(true);
    expect(result.highlights).toHaveLength(1);
    const [highlight] = result.highlights;
    expect(
      result.snippet.slice(highlight.start, highlight.end).toLowerCase(),
    ).toBe("alpha");

    const empty = createHighlightSnippet("", ["anything"]);
    expect(empty).toEqual({
      snippet: "",
      highlights: [],
      leadingEllipsis: false,
      trailingEllipsis: false,
    });
  });
});
