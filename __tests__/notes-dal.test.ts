import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/client-data/db";
import {
  createNote,
  deleteNote,
  dropEmbeddingsForOtherModels,
  permanentlyDeleteNote,
  purgeDeletedNotes,
  restoreNote,
  TRASH_RETENTION_MS,
} from "@/client-data/notes-dal";

const vec = (...n: number[]) => new Float32Array(n).buffer;

async function seedIndexedNote(content: string) {
  const id = await createNote({ content });
  await db.chunks.put({
    id: `${id}:a`,
    noteId: id,
    order: 0,
    text: content,
    hash: "h",
  });
  await db.noteHashes.put({ noteId: id, lastIndexedHash: "h1" });
  await db.embeddings.bulkPut([
    { chunkId: `${id}:a`, noteId: id, modelId: "m1", vectorBuffer: vec(1, 0) },
    { chunkId: `${id}:a`, noteId: id, modelId: "m2", vectorBuffer: vec(0, 1) },
  ]);
  return id;
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("notes dal", () => {
  it("soft delete drops the search index but keeps the note", async () => {
    const id = await seedIndexedNote("hello");
    await deleteNote(id);
    const note = await db.notes.get(id);
    expect(note?.deleted).toBe(1);
    expect(note?.deletedAt).toBeInstanceOf(Date);
    expect(await db.chunks.count()).toBe(0);
    expect(await db.embeddings.count()).toBe(0);
    expect(await db.noteHashes.count()).toBe(0);
  });

  it("restore clears the deleted flag", async () => {
    const id = await seedIndexedNote("hello");
    await deleteNote(id);
    await restoreNote(id);
    const note = await db.notes.get(id);
    expect(note?.deleted).toBe(0);
    expect(note?.deletedAt).toBeUndefined();
  });

  it("permanent delete removes everything", async () => {
    const id = await seedIndexedNote("hello");
    await permanentlyDeleteNote(id);
    expect(await db.notes.count()).toBe(0);
    expect(await db.embeddings.count()).toBe(0);
  });

  it("purges only trash older than the retention window", async () => {
    const old = await seedIndexedNote("old");
    const recent = await seedIndexedNote("recent");
    const live = await seedIndexedNote("live");
    await deleteNote(old);
    await deleteNote(recent);
    await db.notes.update(old, {
      deletedAt: new Date(Date.now() - TRASH_RETENTION_MS - 1000),
    });
    expect(await purgeDeletedNotes()).toBe(1);
    expect(await db.notes.get(old)).toBeUndefined();
    expect(await db.notes.get(recent)).toBeDefined();
    expect(await db.notes.get(live)).toBeDefined();
  });

  it("drops embeddings from other models only", async () => {
    await seedIndexedNote("x");
    await dropEmbeddingsForOtherModels("m1");
    const rows = await db.embeddings.toArray();
    expect(rows.map((r) => r.modelId)).toEqual(["m1"]);
  });
});
