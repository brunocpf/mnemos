import { strToU8, unzipSync, zipSync } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/client-data/db";
import { buildNotesArchive } from "@/client-data/export-notes";
import { createFolder } from "@/client-data/folders-dal";
import {
  applyImport,
  ImportError,
  parseImportFiles,
} from "@/client-data/import-notes";
import { deleteNote } from "@/client-data/notes-dal";
import {
  claimUniqueName,
  noteFileStem,
  parseNoteFile,
  sanitizePathSegment,
  serializeNoteFile,
} from "@/lib/note-markdown";

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

function source(name: string, bytes: Uint8Array) {
  return {
    name,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.slice().buffer,
  };
}

function zipSource(entries: Record<string, Uint8Array>, name = "x.zip") {
  return source(name, zipSync(entries));
}

async function expectCode(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ImportError);
  expect((error as ImportError).code).toBe(code);
}

async function seed() {
  const work = await createFolder({ name: "Work" });
  const projects = await createFolder({ name: "Projects", parentId: work });
  await createFolder({ name: "Empty" });
  const notes = [
    {
      id: crypto.randomUUID(),
      title: 'Plan: "Q3" / roadmap?',
      content: "# Plan\n\n- one\n- two\n",
      folderId: projects,
      deleted: 0,
      createdAt: new Date("2025-01-02T03:04:05.678Z"),
      updatedAt: new Date("2025-02-03T04:05:06.789Z"),
    },
    {
      id: crypto.randomUUID(),
      title: 'Plan: "Q3" / roadmap?',
      content: "duplicate title",
      folderId: projects,
      deleted: 0,
      createdAt: new Date("2025-03-01T00:00:00.000Z"),
      updatedAt: new Date("2025-03-01T00:00:00.000Z"),
    },
    {
      id: crypto.randomUUID(),
      content: "\n\n---\nuntitled and starts with blank lines",
      folderId: work,
      deleted: 0,
      createdAt: new Date("2025-04-01T00:00:00.000Z"),
      updatedAt: new Date("2025-04-02T00:00:00.000Z"),
    },
  ];
  await db.notes.bulkAdd(notes);
  return { notes, work, projects };
}

describe("note markdown helpers", () => {
  it("round-trips front matter, including awkward titles and bodies", () => {
    const note = {
      id: crypto.randomUUID(),
      title: 'He said "hi": a\\b\nc',
      content: "---\nnot: front matter\n---\n\nbody\n",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
    };
    const { metadata, content } = parseNoteFile(serializeNoteFile(note));
    expect(metadata).toEqual({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
    expect(content).toBe(note.content);
  });

  it("leaves a plain Markdown file untouched", () => {
    expect(parseNoteFile("---\nfoo: bar\n---\nhi")).toEqual({
      metadata: null,
      content: "---\nfoo: bar\n---\nhi",
    });
    expect(parseNoteFile("# Hello").metadata).toBeNull();
  });

  it("sanitises path characters and reserved names", () => {
    expect(sanitizePathSegment('a/b\\c:d*e?"f<g>h|i')).toBe(
      "a-b-c-d-e--f-g-h-i",
    );
    expect(sanitizePathSegment("..")).toBe("Untitled");
    expect(sanitizePathSegment("///")).toBe("Untitled");
    expect(sanitizePathSegment("CON")).toBe("_CON");
    expect(sanitizePathSegment("  .hidden. ")).toBe("hidden");
    expect(sanitizePathSegment("x".repeat(300)).length).toBe(100);
  });

  it("deduplicates case-insensitively and falls back to the first line", () => {
    const taken = new Set<string>();
    expect(claimUniqueName(taken, "Note", ".md")).toBe("Note.md");
    expect(claimUniqueName(taken, "note", ".md")).toBe("note (2).md");
    expect(noteFileStem({ content: "\n## Shopping list\nmilk" })).toBe(
      "Shopping list",
    );
    expect(noteFileStem({ content: "" })).toBe("Untitled");
  });
});

describe("export and import", () => {
  it("exports folders as directories with safe, unique file names", async () => {
    await seed();
    const { bytes, noteCount, folderCount } = await buildNotesArchive();
    expect(noteCount).toBe(3);
    expect(folderCount).toBe(3);
    expect(Object.keys(unzipSync(bytes)).toSorted()).toEqual([
      "Empty/",
      "Work/",
      "Work/Projects/",
      "Work/Projects/Plan- -Q3- - roadmap- (2).md",
      "Work/Projects/Plan- -Q3- - roadmap-.md",
      "Work/untitled and starts with blank lines.md",
    ]);
  });

  it("does not export deleted notes", async () => {
    const { notes } = await seed();
    await deleteNote(notes[1].id);
    const { bytes, noteCount } = await buildNotesArchive();
    expect(noteCount).toBe(2);
    expect(
      Object.keys(unzipSync(bytes)).some((n) => n.endsWith("(2).md")),
    ).toBe(false);
  });

  it("restores notes and folders after export, delete local, import", async () => {
    const { notes } = await seed();
    const { bytes } = await buildNotesArchive();
    await Promise.all(db.tables.map((t) => t.clear()));

    const parsed = await parseImportFiles([source("backup.zip", bytes)]);
    const result = await applyImport(parsed, "merge-skip");
    expect(result).toMatchObject({ created: 3, updated: 0, skipped: 0 });
    expect(result.foldersCreated).toBe(3);

    const folders = await db.folders.toArray();
    const pathOf = (id: string | null | undefined): string => {
      const folder = folders.find((f) => f.id === id);
      return folder ? `${pathOf(folder.parentId)}/${folder.name}` : "";
    };
    expect(folders.map((f) => pathOf(f.id)).toSorted()).toEqual([
      "/Empty",
      "/Work",
      "/Work/Projects",
    ]);

    const expectedPaths = ["/Work/Projects", "/Work/Projects", "/Work"];
    for (const [i, original] of notes.entries()) {
      const restored = await db.notes.get(original.id);
      expect(restored).toMatchObject({
        id: original.id,
        title: original.title,
        content: original.content,
        deleted: 0,
        createdAt: original.createdAt,
        updatedAt: original.updatedAt,
      });
      expect(pathOf(restored?.folderId)).toBe(expectedPaths[i]);
    }
    expect(result.indexedNoteIds.toSorted()).toEqual(
      notes.map((n) => n.id).toSorted(),
    );
  });

  it("imports as new notes with new ids without touching existing ones", async () => {
    const { notes } = await seed();
    const { bytes } = await buildNotesArchive();
    const parsed = await parseImportFiles([source("backup.zip", bytes)]);
    const result = await applyImport(parsed, "new");

    expect(result.created).toBe(3);
    expect(await db.notes.count()).toBe(6);
    expect(await db.folders.count()).toBe(3); // reused by name, not duplicated
    expect(
      result.indexedNoteIds.some((id) => notes.some((n) => n.id === id)),
    ).toBe(false);
    const imported = await db.notes.get(result.indexedNoteIds[0]);
    expect(imported?.createdAt).toBeInstanceOf(Date);
  });

  it("merges by id: overwrites only older local notes, or skips", async () => {
    const { notes } = await seed();
    const { bytes } = await buildNotesArchive();
    const parsed = await parseImportFiles([source("backup.zip", bytes)]);

    // Local copy of note 0 is newer, note 1 is older, note 2 is identical.
    await db.notes.update(notes[0].id, {
      content: "local newer",
      updatedAt: new Date("2030-01-01"),
    });
    await db.notes.update(notes[1].id, {
      content: "local older",
      updatedAt: new Date("2020-01-01"),
    });

    const skip = await applyImport(parsed, "merge-skip");
    expect(skip).toMatchObject({ created: 0, updated: 0, skipped: 3 });
    expect((await db.notes.get(notes[1].id))?.content).toBe("local older");

    const newer = await applyImport(parsed, "merge-newer");
    expect(newer).toMatchObject({ created: 0, updated: 1, skipped: 2 });
    expect((await db.notes.get(notes[0].id))?.content).toBe("local newer");
    expect((await db.notes.get(notes[1].id))?.content).toBe("duplicate title");
    expect(await db.notes.count()).toBe(3);
  });

  it("imports loose Markdown files, using the file name as the title", async () => {
    const parsed = await parseImportFiles([
      source("Groceries.md", strToU8("# milk\n")),
    ]);
    const result = await applyImport(parsed, "new");
    expect(result.created).toBe(1);
    expect(await db.notes.toArray()).toMatchObject([
      { title: "Groceries", content: "# milk\n", deleted: 0 },
    ]);
  });

  it("recreates nested folders with the folders DAL's name rules", async () => {
    await createFolder({ name: "work" });
    const parsed = await parseImportFiles([
      zipSource({
        "Work/Sub/note.md": strToU8("hi"),
        [`${"x".repeat(150)}/`]: new Uint8Array(0),
      }),
    ]);
    await applyImport(parsed, "new");
    const folders = await db.folders.toArray();
    expect(folders.filter((f) => f.name.toLowerCase() === "work")).toHaveLength(
      1,
    );
    expect(folders.some((f) => f.name === "Sub")).toBe(true);
    expect(folders.some((f) => f.name === "x".repeat(100))).toBe(true);
  });
});

describe("import validation", () => {
  it("rejects zip-slip paths and writes nothing", async () => {
    for (const name of [
      "../evil.md",
      "a/../../evil.md",
      "/abs.md",
      "C:/win.md",
      "a\\..\\b.md",
    ]) {
      await expectCode(
        parseImportFiles([zipSource({ [name]: strToU8("x") })]),
        "unsafe-path",
      );
    }
    expect(await db.notes.count()).toBe(0);
  });

  it("rejects non-text entries, invalid text and bad archives", async () => {
    await expectCode(
      parseImportFiles([
        zipSource({ "a.md": strToU8("x"), "pic.png": new Uint8Array([1, 2]) }),
      ]),
      "unsupported-file",
    );
    await expectCode(
      parseImportFiles([
        zipSource({ "bin.md": new Uint8Array([0xff, 0xfe, 0x00, 0x80]) }),
      ]),
      "invalid-text",
    );
    await expectCode(
      parseImportFiles([source("bad.zip", strToU8("not a zip"))]),
      "invalid-zip",
    );
    await expectCode(
      parseImportFiles([source("photo.png", new Uint8Array([1]))]),
      "unsupported-file",
    );
    await expectCode(parseImportFiles([zipSource({})]), "nothing-to-import");
  });

  it("rejects oversized and too many entries", async () => {
    await expectCode(
      parseImportFiles([
        zipSource({ "big.md": new Uint8Array(5 * 1024 * 1024 + 1).fill(97) }),
      ]),
      "file-too-large",
    );
    const many: Record<string, Uint8Array> = {};
    for (let i = 0; i < 5_001; i++) many[`n${i}.md`] = strToU8("x");
    await expectCode(parseImportFiles([zipSource(many)]), "too-many-files");
  });

  it("ignores OS metadata files", async () => {
    const parsed = await parseImportFiles([
      zipSource({
        "a.md": strToU8("x"),
        ".DS_Store": new Uint8Array([0, 1]),
        "__MACOSX/._a.md": new Uint8Array([0, 1]),
      }),
    ]);
    expect(parsed.notes).toHaveLength(1);
  });
});
