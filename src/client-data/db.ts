"use client";

import Dexie, { Table } from "dexie";

import { Chunk } from "@/client-data/chunk";
import { Embedding } from "@/client-data/embedding";
import { Note } from "@/client-data/note";
import { NoteHash } from "@/client-data/note-hash";

class MnemosDb extends Dexie {
  notes: Table<Note, Note["id"]>;
  noteHashes: Table<NoteHash, NoteHash["noteId"]>;
  chunks: Table<Chunk, Chunk["id"]>;
  embeddings: Table<Embedding, Embedding["chunkId"]>;

  constructor() {
    super("mnemos-db");
    this.version(1).stores({
      notes: "id, content, deleted, createdAt, updatedAt, deletedAt",
      noteHashes: "noteId",
      chunks: "id, noteId",
      embeddings: "chunkId",
    });

    this.notes = this.table("notes");
    this.noteHashes = this.table("noteHashes");
    this.chunks = this.table("chunks");
    this.embeddings = this.table("embeddings");
  }
}

export const db = new MnemosDb();
