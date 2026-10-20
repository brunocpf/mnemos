import type { Folder } from "@/client-data/folder";

export type FolderNode = {
  folder: Folder;
  children: FolderNode[];
};

/** Case-insensitive, trimmed key used for sibling-name comparisons. */
export function folderNameKey(name: string) {
  return name.trim().toLocaleLowerCase();
}

function compareFolders(a: Folder, b: Folder) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

/**
 * Builds the forest of folders (roots first, siblings sorted by name).
 * Folders whose parent is missing or that sit in a cycle are treated as roots
 * so corrupted data can never hide a folder.
 */
export function buildFolderTree(folders: readonly Folder[]): FolderNode[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const hasValidParent = (folder: Folder) =>
    folder.parentId !== null && byId.has(folder.parentId);

  const childrenOf = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    const key = hasValidParent(folder) ? folder.parentId : null;
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), folder]);
  }

  const visited = new Set<string>();
  const build = (parentId: string | null): FolderNode[] =>
    (childrenOf.get(parentId) ?? [])
      .toSorted(compareFolders)
      .filter((folder) => !visited.has(folder.id))
      .map((folder) => {
        visited.add(folder.id);
        return { folder, children: build(folder.id) };
      });

  const roots = build(null);
  // Anything unreachable from a root is part of a cycle: surface it at the top.
  const orphans = folders
    .filter((f) => !visited.has(f.id))
    .toSorted(compareFolders)
    .flatMap((folder) => {
      if (visited.has(folder.id)) return [];
      visited.add(folder.id);
      return [{ folder, children: build(folder.id) }];
    });
  return [...roots, ...orphans];
}

/** Root-to-folder chain for `folderId`; empty when it doesn't exist. */
export function getFolderAncestry(
  folders: readonly Folder[],
  folderId: string | null | undefined,
): Folder[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const chain: Folder[] = [];
  const seen = new Set<string>();
  let current = byId.get(folderId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

/** Ids of `folderId` and every folder below it. */
export function getFolderSubtreeIds(
  folders: readonly Folder[],
  folderId: string,
): Set<string> {
  const ids = new Set<string>([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }
  return ids;
}
