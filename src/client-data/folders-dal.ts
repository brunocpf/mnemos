import { db } from "@/client-data/db";
import { Folder, folderNameSchema } from "@/client-data/folder";
import { Note } from "@/client-data/note";
import {
  folderNameKey,
  getFolderAncestry,
  getFolderSubtreeIds,
} from "@/lib/folder-tree";

export type FolderErrorCode =
  | "invalid-name"
  | "duplicate-name"
  | "folder-not-found"
  | "parent-not-found"
  | "note-not-found"
  | "cycle";

export class FolderError extends Error {
  constructor(public readonly code: FolderErrorCode) {
    super(code);
    this.name = "FolderError";
  }
}

type FolderOperation = "create" | "rename" | "move" | "delete" | "move-note";

// Opt-in (off by default, nothing leaves the device): set
// NEXT_PUBLIC_LOG_FOLDER_OPERATIONS=true to log folder operations to the
// console for debugging.
function logFolderOperation(
  operation: FolderOperation,
  details: Record<string, unknown>,
) {
  if (process.env.NEXT_PUBLIC_LOG_FOLDER_OPERATIONS === "true") {
    console.debug(`[folders] ${operation}`, details);
  }
}

function parseName(name: string) {
  const parsed = folderNameSchema.safeParse(name);
  if (!parsed.success) throw new FolderError("invalid-name");
  return parsed.data;
}

async function siblingNameKeys(
  parentId: Folder["parentId"],
  exceptId?: Folder["id"],
) {
  const siblings = await db.folders.toArray();
  return new Set(
    siblings
      .filter((f) => f.parentId === parentId && f.id !== exceptId)
      .map((f) => folderNameKey(f.name)),
  );
}

async function assertParentExists(parentId: Folder["parentId"]) {
  if (parentId !== null && !(await db.folders.get(parentId))) {
    throw new FolderError("parent-not-found");
  }
}

export async function createFolder({
  name,
  parentId = null,
}: {
  name: string;
  parentId?: Folder["parentId"];
}): Promise<Folder["id"]> {
  const cleanName = parseName(name);
  const id = await db.transaction("rw", db.folders, async () => {
    await assertParentExists(parentId);
    if ((await siblingNameKeys(parentId)).has(folderNameKey(cleanName))) {
      throw new FolderError("duplicate-name");
    }
    const now = new Date();
    return await db.folders.add({
      id: crypto.randomUUID(),
      name: cleanName,
      parentId,
      createdAt: now,
      updatedAt: now,
    });
  });
  logFolderOperation("create", { id, parentId });
  return id;
}

export async function renameFolder(id: Folder["id"], name: string) {
  const cleanName = parseName(name);
  await db.transaction("rw", db.folders, async () => {
    const folder = await db.folders.get(id);
    if (!folder) throw new FolderError("folder-not-found");
    if (
      (await siblingNameKeys(folder.parentId, id)).has(folderNameKey(cleanName))
    ) {
      throw new FolderError("duplicate-name");
    }
    await db.folders.update(id, { name: cleanName, updatedAt: new Date() });
  });
  logFolderOperation("rename", { id });
}

/** Moves a folder under `parentId` (`null` = root). A folder can never end up inside itself or one of its descendants. */
export async function moveFolder(
  id: Folder["id"],
  parentId: Folder["parentId"],
) {
  await db.transaction("rw", db.folders, async () => {
    const folder = await db.folders.get(id);
    if (!folder) throw new FolderError("folder-not-found");
    await assertParentExists(parentId);
    if (parentId !== null) {
      const all = await db.folders.toArray();
      if (getFolderSubtreeIds(all, id).has(parentId)) {
        throw new FolderError("cycle");
      }
    }
    if (folder.parentId === parentId) return;
    if ((await siblingNameKeys(parentId, id)).has(folderNameKey(folder.name))) {
      throw new FolderError("duplicate-name");
    }
    await db.folders.update(id, { parentId, updatedAt: new Date() });
  });
  logFolderOperation("move", { id, parentId });
}

/** Appends " (2)", " (3)", … until `name` no longer collides. */
function uniqueName(name: string, taken: Set<string>) {
  if (!taken.has(folderNameKey(name))) return name;
  for (let n = 2; ; n++) {
    const candidate = `${name} (${n})`;
    if (!taken.has(folderNameKey(candidate))) return candidate;
  }
}

/**
 * Deletes a folder without deleting its contents: child folders and every note
 * in it (including trashed ones, so a restore never targets a missing folder)
 * move up to the deleted folder's parent, or the root. A moved child whose
 * name collides with a sibling at the destination is renamed "Name (2)".
 */
export async function deleteFolder(id: Folder["id"]) {
  const result = await db.transaction("rw", db.folders, db.notes, async () => {
    const folder = await db.folders.get(id);
    if (!folder) throw new FolderError("folder-not-found");
    const destination = folder.parentId;

    const children = (await db.folders.toArray())
      .filter((f) => f.parentId === id)
      .toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const taken = await siblingNameKeys(destination, id);
    const now = new Date();
    for (const child of children) {
      const name = uniqueName(child.name, taken);
      taken.add(folderNameKey(name));
      await db.folders.update(child.id, {
        name,
        parentId: destination,
        updatedAt: now,
      });
    }

    const movedNotes = await db.notes
      .where("folderId")
      .equals(id)
      .modify({ folderId: destination });
    await db.folders.delete(id);
    return {
      movedFolders: children.length,
      movedNotes,
      destination,
    };
  });
  logFolderOperation("delete", { id, ...result });
  return result;
}

/**
 * Moves a note into a folder (`null` = root). This is organisation only: it
 * doesn't touch `updatedAt` (list order) or the search index.
 */
export async function moveNote(
  noteId: Note["id"],
  folderId: Folder["id"] | null,
) {
  await db.transaction("rw", db.folders, db.notes, async () => {
    if (!(await db.notes.get(noteId))) throw new FolderError("note-not-found");
    await assertParentExists(folderId);
    await db.notes.update(noteId, { folderId });
  });
  logFolderOperation("move-note", { noteId, folderId });
}

/** Root-to-folder chain, e.g. for breadcrumbs or an export path. */
export async function getFolderPath(id: Folder["id"]) {
  return getFolderAncestry(await db.folders.toArray(), id);
}
