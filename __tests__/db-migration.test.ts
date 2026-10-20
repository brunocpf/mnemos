import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";

import { MnemosDb } from "@/client-data/db";

describe("db schema migration", () => {
  beforeEach(async () => {
    await Dexie.delete("mnemos-db");
  });

  it("upgrades a v1 database, keeping live data and purging orphaned trash index", async () => {
    // Recreate the released v1 schema and seed it.
    const v1 = new Dexie("mnemos-db");
    v1.version(1).stores({
      notes: "id, deleted, updatedAt, createdAt, deletedAt",
      noteHashes: "noteId, indexedAt, embeddedAt",
      chunks: "id, noteId, [noteId+order]",
      embeddings: "[chunkId+modelId], noteId, modelId",
      localEmbeddingErrors: "id, timestamp",
    });
    const now = new Date();
    await v1.table("notes").bulkPut([
      { id: "live", content: "a", deleted: 0, createdAt: now, updatedAt: now },
      {
        id: "dead",
        content: "b",
        deleted: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: now,
      },
    ]);
    await v1.table("chunks").bulkPut([
      { id: "live:1", noteId: "live", order: 0, text: "a", hash: "x" },
      { id: "dead:1", noteId: "dead", order: 0, text: "b", hash: "y" },
    ]);
    const buf = new Float32Array([1]).buffer;
    await v1.table("embeddings").bulkPut([
      { chunkId: "live:1", noteId: "live", modelId: "m", vectorBuffer: buf },
      { chunkId: "dead:1", noteId: "dead", modelId: "m", vectorBuffer: buf },
    ]);
    await v1.table("noteHashes").put({ noteId: "dead" });
    v1.close();

    const db = new MnemosDb();
    await db.open();
    expect(db.verno).toBe(4);
    expect(await db.notes.count()).toBe(2);
    expect((await db.chunks.toArray()).map((c) => c.id)).toEqual(["live:1"]);
    expect((await db.embeddings.toArray()).map((e) => e.chunkId)).toEqual([
      "live:1",
    ]);
    expect(await db.noteHashes.count()).toBe(0);
    // new chunkId index is usable
    expect(await db.embeddings.where("chunkId").equals("live:1").count()).toBe(
      1,
    );
    // v3 adds the embedding job queue, empty after the upgrade
    expect(await db.embeddingJobs.count()).toBe(0);
    db.close();
  });

  it("upgrades a v3 database to v4, leaving existing notes at the root", async () => {
    const v3 = new Dexie("mnemos-db");
    v3.version(1).stores({
      notes: "id, deleted, updatedAt, createdAt, deletedAt",
      noteHashes: "noteId, indexedAt, embeddedAt",
      chunks: "id, noteId, [noteId+order]",
      embeddings: "[chunkId+modelId], noteId, modelId",
      localEmbeddingErrors: "id, timestamp",
    });
    v3.version(2).stores({
      embeddings: "[chunkId+modelId], noteId, modelId, chunkId",
    });
    v3.version(3).stores({
      embeddingJobs:
        "id, &[chunkId+modelId], noteId, [noteId+status], [status+createdAt], modelId",
    });
    const now = new Date();
    await v3.table("notes").bulkPut([
      { id: "a", content: "a", deleted: 0, createdAt: now, updatedAt: now },
      { id: "b", content: "b", deleted: 0, createdAt: now, updatedAt: now },
    ]);
    v3.close();

    const db = new MnemosDb();
    await db.open();
    expect(db.verno).toBe(4);
    expect(await db.folders.count()).toBe(0);
    const notes = await db.notes.toArray();
    expect(notes).toHaveLength(2);
    // no folder assigned means root
    expect(notes.every((n) => !n.folderId)).toBe(true);
    // the folderId index works on upgraded data
    await db.folders.add({
      id: "f",
      name: "F",
      parentId: null,
      createdAt: now,
      updatedAt: now,
    });
    await db.notes.update("a", { folderId: "f" });
    expect(
      (await db.notes.where("folderId").equals("f").toArray()).map((n) => n.id),
    ).toEqual(["a"]);
    expect(await db.folders.where("parentId").equals("f").count()).toBe(0);
    db.close();
  });
});
