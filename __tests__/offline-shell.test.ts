import { describe, expect, it } from "vitest";

import { getOfflineShellPath } from "../src/lib/offline-shell";

describe("getOfflineShellPath", () => {
  it("maps static routes to themselves", () => {
    expect(getOfflineShellPath("/")).toBe("/");
    expect(getOfflineShellPath("/note")).toBe("/note");
    expect(getOfflineShellPath("/settings")).toBe("/settings");
    expect(getOfflineShellPath("/share")).toBe("/share");
    expect(getOfflineShellPath("/privacy-policy")).toBe("/privacy-policy");
  });

  it("keeps the locale prefix so shells never cross locales", () => {
    expect(getOfflineShellPath("/pt-BR")).toBe("/pt-BR");
    expect(getOfflineShellPath("/pt-BR/")).toBe("/pt-BR");
    expect(getOfflineShellPath("/pt-BR/note")).toBe("/pt-BR/note");
    expect(getOfflineShellPath("/pt-BR/settings")).toBe("/pt-BR/settings");
  });

  it("serves one placeholder shell for every folder", () => {
    expect(getOfflineShellPath("/folders/abc")).toBe("/folders/_");
    expect(getOfflineShellPath("/pt-BR/folders/abc")).toBe("/pt-BR/folders/_");
  });

  it("tolerates a trailing slash", () => {
    expect(getOfflineShellPath("/note/")).toBe("/note");
  });

  it("returns null for unknown routes and the offline page", () => {
    expect(getOfflineShellPath("/nope")).toBeNull();
    expect(getOfflineShellPath("/pt-BR/nope")).toBeNull();
    expect(getOfflineShellPath("/~offline")).toBeNull();
    expect(getOfflineShellPath("/folders")).toBeNull();
    expect(getOfflineShellPath("/folders/a/b")).toBeNull();
    expect(getOfflineShellPath("/pt-BRx/note")).toBeNull();
  });
});
