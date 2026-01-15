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
    expect(decodeSearchHighlight(invalidPayload)).toBeUndefined();
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
    expect(result.leadingEllipsis).toBe(false);
    expect(result.trailingEllipsis).toBe(false);
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

  it("adds a leading ellipsis when highlights appear deep in the content", () => {
    const padding = Array.from({ length: 20 }, (_, idx) => `word${idx}`).join(
      " ",
    );
    const text = `${padding} keyword target appears towards the end.`;

    const result = createHighlightSnippet(text, ["keyword"], {
      maxLength: 40,
    });

    expect(result.leadingEllipsis).toBe(true);
    expect(result.snippet.startsWith("word")).toBe(true);
    expect(result.snippet.toLowerCase()).toContain("keyword");
    expect(result.highlights).not.toHaveLength(0);
  });

  it("keeps the leading ellipsis off when highlights are near the beginning", () => {
    const text =
      "Keyword sits right at the beginning but the rest of the sentence is long enough to trim.";

    const result = createHighlightSnippet(text, ["keyword"], {
      maxLength: 25,
    });

    expect(result.leadingEllipsis).toBe(false);
    expect(result.trailingEllipsis).toBe(true);
    expect(result.snippet.startsWith("Keyword")).toBe(true);
  });

  it("adds both leading and trailing ellipses when highlights are in the middle of a long note", () => {
    const prefix = Array.from({ length: 30 }, (_, idx) => `pre${idx}`).join(
      " ",
    );
    const suffix = Array.from({ length: 30 }, (_, idx) => `post${idx}`).join(
      " ",
    );
    const text = `${prefix} keyword ${suffix}`;

    const result = createHighlightSnippet(text, ["keyword"], {
      maxLength: 50,
    });

    expect(result.leadingEllipsis).toBe(true);
    expect(result.trailingEllipsis).toBe(true);
    expect(result.snippet.toLowerCase()).toContain("keyword");
  });

  it("omits the trailing ellipsis when the snippet already includes the document end", () => {
    const filler = Array.from({ length: 15 }, () => "filler").join(" ");
    const text = `${filler} keyword closing sentence.`;

    const result = createHighlightSnippet(text, ["keyword"], {
      maxLength: 120,
    });

    expect(result.leadingEllipsis).toBe(true);
    expect(result.trailingEllipsis).toBe(false);
    expect(result.snippet.endsWith("closing sentence.")).toBe(true);
  });

  it("sets the trailing ellipsis when the highlight is near the end but the snippet is trimmed", () => {
    const filler = Array.from({ length: 10 }, (_, idx) => `chunk${idx}`).join(
      " ",
    );
    const text = `Title section ${filler} keyword final thoughts with extra padding to trim.`;

    const result = createHighlightSnippet(text, ["keyword"], {
      maxLength: 50,
    });

    expect(result.leadingEllipsis).toBe(true);
    expect(result.trailingEllipsis).toBe(true);
    expect(result.snippet.toLowerCase()).toContain("keyword");
  });
});
