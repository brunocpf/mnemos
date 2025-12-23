"use client";

import type { IndexRequest, IndexResponse } from "@/workers/indexer.worker";

export type NotePayload = {
  id: string;
  title?: string;
  content: string;
};

export class IndexerService {
  private worker: Worker;
  private timers = new Map<string, number>();
  private versions = new Map<string, number>();
  private latestVersion = new Map<string, number>();

  constructor(
    private callbacks: {
      onResult: (res: IndexResponse) => void;
    },
  ) {
    if (typeof Worker === "undefined") {
      this.worker = {} as Worker;
      return;
    }

    this.worker = new Worker(
      new URL("@/workers/indexer.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    this.worker.onmessage = (ev: MessageEvent<IndexResponse>) => {
      const res = ev.data;

      if (res.type !== "INDEX_RESULT") return;

      const latest = this.latestVersion.get(res.noteId);
      if (latest !== res.version) return;

      this.callbacks.onResult(res);
    };

    this.worker.onerror = (err) => {
      console.error("Indexer worker error:", err);
    };

    this.worker.onmessageerror = (err) => {
      console.error("Indexer worker message error:", err);
    };
  }

  schedule(note: NotePayload, delayMs = 1000) {
    const version = (this.versions.get(note.id) ?? 0) + 1;
    this.versions.set(note.id, version);
    this.latestVersion.set(note.id, version);

    const existing = this.timers.get(note.id);
    if (existing) window.clearTimeout(existing);

    const timer = window.setTimeout(() => {
      this.postIndexJob(note, version);
    }, delayMs);

    this.timers.set(note.id, timer);
  }

  flush(note: NotePayload) {
    const version = (this.versions.get(note.id) ?? 0) + 1;
    this.versions.set(note.id, version);
    this.latestVersion.set(note.id, version);

    const existing = this.timers.get(note.id);
    if (existing) window.clearTimeout(existing);

    this.postIndexJob(note, version);
  }

  private postIndexJob(note: NotePayload, version: number) {
    const req: IndexRequest = {
      type: "INDEX_NOTE",
      noteId: note.id,
      version,
      title: note.title,
      content: note.content,
      settings: {
        targetChars: 800,
        maxChars: 1200,
      },
    };
    this.worker.postMessage(req);
  }

  dispose() {
    for (const timer of this.timers.values()) window.clearTimeout(timer);
    this.timers.clear();
    this.worker.terminate();
  }
}
