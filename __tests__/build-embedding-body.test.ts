import { describe, expect, it } from "vitest";

import { buildEmbeddingBody } from "../src/lib/build-embedding-body";
import { sha256 } from "../src/lib/sha256";

describe("buildEmbeddingBody", () => {
  it("prepends the title", () => {
    expect(buildEmbeddingBody("Groceries", "- milk")).toBe(
      "Title: Groceries\n\n---\n\n- milk",
    );
  });

  it("returns the content untouched without a usable title", () => {
    expect(buildEmbeddingBody(undefined, "- milk")).toBe("- milk");
    expect(buildEmbeddingBody("   ", "- milk")).toBe("- milk");
  });

  it("changes the hash when the note is renamed", async () => {
    const a = await sha256(buildEmbeddingBody("Groceries", "- milk"));
    const b = await sha256(buildEmbeddingBody("Shopping", "- milk"));
    expect(a).not.toBe(b);
  });
});
