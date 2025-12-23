import { describe, expect, it } from "vitest";

import { normalizeMarkdown } from "../src/lib/normalize-markdown";

describe("normalizeMarkdown", () => {
  it("converts CRLF line endings to LF and trims trailing newline", () => {
    const input = "# Title\r\n\r\nSome text\r\n";
    const output = normalizeMarkdown(input);
    expect(output).toBe("# Title\n\nSome text");
  });

  it("trims trailing whitespace but keeps interior spacing", () => {
    const input = "Intro line\n  Detail line   \n\n   ";
    const output = normalizeMarkdown(input);
    expect(output).toBe("Intro line\n  Detail line");
  });

  it("returns the same string when already normalized", () => {
    const input = "Line A\nLine B\nLine C";
    const output = normalizeMarkdown(input);
    expect(output).toBe(input);
  });

  it("handles single-line input without newline characters", () => {
    const input = "Single line content   ";
    const output = normalizeMarkdown(input);
    expect(output).toBe("Single line content");
  });
});
