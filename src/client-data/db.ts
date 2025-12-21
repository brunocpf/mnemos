"use client";

import Dexie, { Table } from "dexie";

import { Note } from "@/client-data/note";

class MnemosDb extends Dexie {
  notes: Table<Note, Note["id"]>;

  constructor() {
    super("mnemos-db");
    this.version(1).stores({
      notes: "id, content, deleted, createdAt, updatedAt, deletedAt",
    });

    this.notes = this.table("notes");
  }
}

export const db = new MnemosDb();
