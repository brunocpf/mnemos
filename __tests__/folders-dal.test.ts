import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/client-data/db";
import {
  createFolder,
  deleteFolder,
  FolderError,
  getFolderPath,
  moveFolder,
  moveNote,
  renameFolder,
} from "@/client-data/folders-dal";
import { createNote, deleteNote } from "@/client-data/notes-dal";

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

async function code(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    return e instanceof FolderError ? e.code : e;
  }
  return undefined;
}

describe("folders dal", () => {
  it("creates nested folders with trimmed names", async () => {
    const a = await createFolder({ name: "  Work " });
    const b = await createFolder({ name: "Projects", parentId: a });
    const folder = await db.folders.get(a);
    expect(folder).toMatchObject({ name: "Work", parentId: null });
    expect((await db.folders.get(b))?.parentId).toBe(a);
    expect((await getFolderPath(b)).map((f) => f.name)).toEqual([
      "Work",
      "Projects",
    ]);
  });

  it("rejects empty, too long and duplicate sibling names (case-insensitive)", async () => {
    const a = await createFolder({ name: "Work" });
    expect(await code(createFolder({ name: "   " }))).toBe("invalid-name");
    expect(await code(createFolder({ name: "x".repeat(101) }))).toBe(
      "invalid-name",
    );
    expect(await code(createFolder({ name: "work" }))).toBe("duplicate-name");
    // same name under a different parent is fine
    await createFolder({ name: "Work", parentId: a });
    expect(await code(createFolder({ name: "x", parentId: "nope" }))).toBe(
      "parent-not-found",
    );
  });

  it("renames, allowing a case-only change but not a sibling's name", async () => {
    const a = await createFolder({ name: "Work" });
    const b = await createFolder({ name: "Home" });
    await renameFolder(a, "WORK");
    expect((await db.folders.get(a))?.name).toBe("WORK");
    expect(await code(renameFolder(b, "work"))).toBe("duplicate-name");
    expect(await code(renameFolder("missing", "x"))).toBe("folder-not-found");
  });

  it("moves folders and prevents cycles", async () => {
    const a = await createFolder({ name: "A" });
    const b = await createFolder({ name: "B", parentId: a });
    const c = await createFolder({ name: "C", parentId: b });

    expect(await code(moveFolder(a, a))).toBe("cycle");
    expect(await code(moveFolder(a, c))).toBe("cycle");
    expect(await code(moveFolder(b, c))).toBe("cycle");

    await moveFolder(c, null);
    expect((await db.folders.get(c))?.parentId).toBeNull();
    await moveFolder(b, c);
    expect((await getFolderPath(b)).map((f) => f.name)).toEqual(["C", "B"]);
  });

  it("refuses a move that collides with a sibling name", async () => {
    const a = await createFolder({ name: "A" });
    await createFolder({ name: "Dup", parentId: a });
    const other = await createFolder({ name: "dup" });
    expect(await code(moveFolder(other, a))).toBe("duplicate-name");
  });

  it("moves notes between folders and back to the root without touching updatedAt", async () => {
    const f = await createFolder({ name: "F" });
    const id = await createNote({ content: "hi" });
    const before = (await db.notes.get(id))!.updatedAt;

    await moveNote(id, f);
    expect((await db.notes.get(id))?.folderId).toBe(f);
    expect((await db.notes.get(id))?.updatedAt).toEqual(before);

    await moveNote(id, null);
    expect((await db.notes.get(id))?.folderId).toBeNull();
    expect(await code(moveNote(id, "nope"))).toBe("parent-not-found");
    expect(await code(moveNote("nope", f))).toBe("note-not-found");
  });

  it("creates notes in a folder", async () => {
    const f = await createFolder({ name: "F" });
    const id = await createNote({ content: "hi", folderId: f });
    expect((await db.notes.get(id))?.folderId).toBe(f);
  });

  it("deleting a folder moves its notes (trashed too) and subfolders up to the parent", async () => {
    const a = await createFolder({ name: "A" });
    const b = await createFolder({ name: "B", parentId: a });
    const c = await createFolder({ name: "C", parentId: b });
    const live = await createNote({ content: "live", folderId: b });
    const trashed = await createNote({ content: "trashed", folderId: b });
    await deleteNote(trashed);
    const untouched = await createNote({ content: "x", folderId: a });

    const result = await deleteFolder(b);
    expect(result).toEqual({ movedFolders: 1, movedNotes: 2, destination: a });
    expect(await db.folders.get(b)).toBeUndefined();
    expect((await db.folders.get(c))?.parentId).toBe(a);
    expect((await db.notes.get(live))?.folderId).toBe(a);
    expect((await db.notes.get(trashed))?.folderId).toBe(a);
    expect((await db.notes.get(untouched))?.folderId).toBe(a);
  });

  it("deleting a top-level folder moves contents to the root", async () => {
    const a = await createFolder({ name: "A" });
    const child = await createFolder({ name: "Child", parentId: a });
    const note = await createNote({ content: "n", folderId: a });

    const result = await deleteFolder(a);
    expect(result.destination).toBeNull();
    expect((await db.folders.get(child))?.parentId).toBeNull();
    expect((await db.notes.get(note))?.folderId).toBeNull();
  });

  it("renames moved subfolders that collide with destination siblings", async () => {
    const a = await createFolder({ name: "A" });
    await createFolder({ name: "Docs" });
    const nested = await createFolder({ name: "docs", parentId: a });
    await deleteFolder(a);
    expect((await db.folders.get(nested))?.name).toBe("docs (2)");
    expect(await db.folders.count()).toBe(2);
  });

  it("deleting a missing folder fails and changes nothing", async () => {
    const note = await createNote({ content: "n" });
    expect(await code(deleteFolder("missing"))).toBe("folder-not-found");
    expect(await db.notes.get(note)).toBeDefined();
  });
});
