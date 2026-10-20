import { db } from "@/client-data/db";
import { Note } from "@/client-data/note";

export async function createNote(
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

export const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Soft-deletes a note and drops its search index (chunks, embeddings, hashes)
 * so deleted notes can never surface in search. Restoring re-indexes the note
 * through the embedder's backfill.
 */
export async function deleteNote(id: Note["id"]) {
  return await db.transaction(
    "rw",
    db.notes,
    db.chunks,
    db.embeddings,
    db.embeddingJobs,
    db.noteHashes,
    async () => {
      const updated = await db.notes.update(id, {
        deleted: 1,
        deletedAt: new Date(),
      });
      await dropNoteIndex(id);
      return updated;
    },
  );
}

async function dropNoteIndex(id: Note["id"]) {
  await db.chunks.where("noteId").equals(id).delete();
  await db.embeddings.where("noteId").equals(id).delete();
  await db.embeddingJobs.where("noteId").equals(id).delete();
  await db.noteHashes.delete(id);
}

/** Permanently removes soft-deleted notes older than the retention window. */
export async function purgeDeletedNotes(
  olderThanMs: number = TRASH_RETENTION_MS,
  now: number = Date.now(),
) {
  const cutoff = now - olderThanMs;
  const stale = await db.notes
    .where("deleted")
    .equals(1)
    .filter((n) => !n.deletedAt || n.deletedAt.getTime() <= cutoff)
    .primaryKeys();
  for (const id of stale) await permanentlyDeleteNote(id);
  return stale.length;
}

/** Removes embeddings computed with models other than `modelId`. */
export async function dropEmbeddingsForOtherModels(modelId: string) {
  await db.embeddingJobs.where("modelId").notEqual(modelId).delete();
  return await db.embeddings.where("modelId").notEqual(modelId).delete();
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
  await db.transaction(
    "rw",
    db.notes,
    db.chunks,
    db.embeddings,
    db.embeddingJobs,
    db.noteHashes,
    async () => {
      await db.chunks.where("noteId").equals(id).delete();
      await db.embeddings.where("noteId").equals(id).delete();
      await db.embeddingJobs.where("noteId").equals(id).delete();
      await db.noteHashes.delete(id);
      await db.notes.delete(id);
    },
  );
}
