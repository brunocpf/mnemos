import { beforeAll, describe, expect, it } from "vitest";

import { sha256 } from "../src/lib/sha256";

describe("sha256", () => {
  beforeAll(async () => {
    if (!globalThis.crypto?.subtle) {
      const { webcrypto } = await import("crypto");
      globalThis.crypto = webcrypto as Crypto;
    }
  });

  it("returns the correct hash for an empty string", async () => {
    await expect(sha256("")).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("returns the correct hash for a simple string", async () => {
    await expect(sha256("hello")).resolves.toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("produces a 64-character hexadecimal hash", async () => {
    const hash = await sha256("mnemos");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
