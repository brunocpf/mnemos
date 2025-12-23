import { describe, it, expect } from "vitest";

import { getMarkdownBlocks } from "../src/lib/get-markdown-blocks";

describe("getMarkdownBlocks", () => {
  it("splits markdown into blocks by headings and blank lines", () => {
    const md = `# Title
Line 1

Line 2
## Subtitle
Another line

Final paragraph`;

    expect(getMarkdownBlocks(md)).toEqual([
      "# Title\nLine 1",
      "Line 2",
      "## Subtitle\nAnother line",
      "Final paragraph",
    ]);
  });

  it("handles markdown without headings", () => {
    const md = `
First paragraph with leading blank.

Second paragraph after blank.

Third paragraph`;

    expect(getMarkdownBlocks(md)).toEqual([
      "First paragraph with leading blank.",
      "Second paragraph after blank.",
      "Third paragraph",
    ]);
  });

  it("keeps consecutive headings as separate blocks and trims whitespace", () => {
    const md = `# First

## Second
Content under second

### Third
`;

    expect(getMarkdownBlocks(md)).toEqual([
      "# First",
      "## Second\nContent under second",
      "### Third",
    ]);
  });
});
it("returns empty array for input with only whitespace", () => {
  expect(getMarkdownBlocks("   \n \t  \n")).toEqual([]);
});

it("treats consecutive blank lines as a single separator", () => {
  const md = `Paragraph one


Paragraph two



Paragraph three`;

  expect(getMarkdownBlocks(md)).toEqual([
    "Paragraph one",
    "Paragraph two",
    "Paragraph three",
  ]);
});

it("keeps list content with its heading", () => {
  const md = `# Shopping List
- Apples
- Oranges
- Bananas

Remember to buy milk`;

  expect(getMarkdownBlocks(md)).toEqual([
    "# Shopping List\n- Apples\n- Oranges\n- Bananas",
    "Remember to buy milk",
  ]);
});
