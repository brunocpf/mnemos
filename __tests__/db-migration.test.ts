import Dexie from "dexie";
import { describe, expect, it } from "vitest";

import { MnemosDb } from "@/client-data/db";

describe("db schema migration", () => {
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
    expect(db.verno).toBe(3);
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
});
