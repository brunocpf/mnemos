import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/client-data/db";
import { createNoteFromShare } from "@/client-data/share-note";
import { buildSharedContent, MAX_SHARED_LENGTH } from "@/lib/shared-content";

describe("buildSharedContent", () => {
  it("returns empty content when nothing usable is shared", () => {
    expect(buildSharedContent({})).toBe("");
    expect(buildSharedContent({ title: " ", text: "\n", url: null })).toBe("");
  });

  it("keeps plain shared text as is", () => {
    expect(buildSharedContent({ text: "  a snippet  " })).toBe("a snippet");
  });

  it("puts the title in a heading and appends the url", () => {
    expect(
      buildSharedContent({
        title: "Page",
        text: "quote",
        url: "https://example.com/a",
      }),
    ).toBe("# Page\n\nquote\n\nhttps://example.com/a");
  });

  it("does not repeat the url when text already contains it", () => {
    expect(
      buildSharedContent({
        title: "Page",
        text: "Look https://example.com/a",
        url: "https://example.com/a",
      }),
    ).toBe("# Page\n\nLook https://example.com/a");
  });

  it("drops text that only repeats the title", () => {
    expect(
      buildSharedContent({ title: "Page", text: "Page", url: "https://e.co" }),
    ).toBe("# Page\n\nhttps://e.co");
  });

  it("normalizes line endings and flattens multi-line titles", () => {
    expect(buildSharedContent({ title: "a\nb", text: "x\r\ny" })).toBe(
      "# a b\n\nx\ny",
    );
  });

  it("caps oversized payloads", () => {
    const out = buildSharedContent({ text: "x".repeat(MAX_SHARED_LENGTH + 5) });
    expect(out).toHaveLength(MAX_SHARED_LENGTH);
  });
});

describe("createNoteFromShare", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it("creates a note from shared text", async () => {
    const id = await createNoteFromShare({
      title: "Hello",
      text: "world",
      url: "https://example.com",
    });
    expect(id).toBeDefined();
    const note = await db.notes.get(id!);
    expect(note?.content).toBe("# Hello\n\nworld\n\nhttps://example.com");
    expect(note?.deleted).toBe(0);
  });

  it("creates nothing for an empty share", async () => {
    expect(await createNoteFromShare({ text: "  " })).toBeUndefined();
    expect(await db.notes.count()).toBe(0);
  });
});
