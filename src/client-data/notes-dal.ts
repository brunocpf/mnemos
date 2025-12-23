import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/client-data/db";
import { Note } from "@/client-data/note";
import { dexieLoading } from "@/lib/dexie-loading";

export async function addNote(
  note: Omit<Note, "id" | "deleted" | "createdAt" | "updatedAt" | "deletedAt">,
) {
  return await db.notes.add({
    ...note,
    id: crypto.randomUUID(),
    deleted: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function deleteNote(id: Note["id"]) {
  return await db.notes.update(id, { deleted: 1, deletedAt: new Date() });
}

export async function updateNoteTitle(id: Note["id"], title: string) {
  return await db.notes.update(id, { title, updatedAt: new Date() });
}

export async function updateNoteContent(id: Note["id"], content: string) {
  return await db.notes.update(id, { content, updatedAt: new Date() });
}

export async function updateNote(
  id: Note["id"],
  updates: Partial<Omit<Note, "id" | "createdAt" | "deleted" | "deletedAt">>,
) {
  return await db.notes.update(id, { ...updates, updatedAt: new Date() });
}

export async function restoreNote(id: Note["id"]) {
  return await db.notes.update(id, { deleted: 0, deletedAt: undefined });
}

export async function permanentlyDeleteNote(id: Note["id"]) {
  const chunkIds = await db.chunks.where("noteId").equals(id).primaryKeys();
  await db.transaction(
    "rw",
    db.notes,
    db.chunks,
    db.embeddings,
    db.noteHashes,
    async () => {
      await db.chunks.where("noteId").equals(id).delete();
      await db.embeddings.where("chunkId").anyOf(chunkIds).delete();
      await db.noteHashes.delete(id);
      await db.notes.delete(id);
    },
  );
}

export function useNotes() {
  const notesResult = useLiveQuery(
    () => db.notes.where("deleted").equals(0).reverse().sortBy("updatedAt"),
    [],
    dexieLoading,
  );

  return {
    data: notesResult === dexieLoading ? undefined : notesResult,
    isLoading: notesResult === dexieLoading,
  };
}

export function useNoteById(id?: Note["id"]) {
  const noteResult = useLiveQuery(
    () => (id === undefined ? undefined : db.notes.get(id)),
    [id],
    dexieLoading,
  );

  return {
    data:
      noteResult === dexieLoading
        ? undefined
        : noteResult?.deleted === 0
          ? noteResult
          : undefined,
    isLoading: noteResult === dexieLoading,
  };
}
