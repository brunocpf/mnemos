import { describe, expect, it } from "vitest";

import type { Folder } from "@/client-data/folder";
import {
  buildFolderTree,
  getFolderAncestry,
  getFolderSubtreeIds,
} from "@/lib/folder-tree";

const f = (id: string, name: string, parentId: string | null): Folder => ({
  id,
  name,
  parentId,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe("folder tree", () => {
  const folders = [
    f("c", "Charlie", "a"),
    f("a", "alpha", null),
    f("b", "Bravo", null),
    f("d", "Delta", "c"),
  ];

  it("nests folders and sorts siblings by name", () => {
    const tree = buildFolderTree(folders);
    expect(tree.map((n) => n.folder.id)).toEqual(["a", "b"]);
    expect(tree[0].children[0].folder.id).toBe("c");
    expect(tree[0].children[0].children[0].folder.id).toBe("d");
  });

  it("returns ancestry and subtree ids", () => {
    expect(getFolderAncestry(folders, "d").map((x) => x.id)).toEqual([
      "a",
      "c",
      "d",
    ]);
    expect(getFolderAncestry(folders, null)).toEqual([]);
    expect(getFolderAncestry(folders, "zzz")).toEqual([]);
    expect([...getFolderSubtreeIds(folders, "a")].sort()).toEqual([
      "a",
      "c",
      "d",
    ]);
  });

  it("surfaces orphans and cycles instead of hiding or looping", () => {
    const broken = [f("x", "X", "y"), f("y", "Y", "x"), f("o", "O", "missing")];
    const tree = buildFolderTree(broken);
    const ids = new Set<string>();
    const walk = (nodes: typeof tree) =>
      nodes.forEach((n) => {
        ids.add(n.folder.id);
        walk(n.children);
      });
    walk(tree);
    expect([...ids].sort()).toEqual(["o", "x", "y"]);
    expect(getFolderAncestry(broken, "x").length).toBeLessThanOrEqual(2);
  });
});
