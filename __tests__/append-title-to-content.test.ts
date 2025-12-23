import { describe, expect, it } from "vitest";

import { appendTitleToContent } from "../src/lib/append-title-to-content";

describe("appendTitleToContent", () => {
  it("formats title and content with separator", () => {
    expect(appendTitleToContent("My Title", "Some content")).toBe(
      "Title: My Title\n\n---\n:Some content",
    );
  });

  it("handles empty title and content", () => {
    expect(appendTitleToContent("", "")).toBe("Title: \n\n---\n:");
  });

  it("preserves multiline content and special characters", () => {
    const content = "Line one\nLine two\n- bullet";
    expect(appendTitleToContent("Special & Title", content)).toBe(
      `Title: Special & Title\n\n---\n:${content}`,
    );
  });
});
