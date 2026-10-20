import { unzipSync } from "fflate";

import { db } from "@/client-data/db";
import { FOLDER_NAME_MAX_LENGTH } from "@/client-data/folder";
import { createFolder } from "@/client-data/folders-dal";
import { Note } from "@/client-data/note";
import { folderNameKey } from "@/lib/folder-tree";
import { NOTE_TITLE_MAX_LENGTH, parseNoteFile } from "@/lib/note-markdown";

/** Hard caps so a hostile or accidental archive can't exhaust memory. */
export const IMPORT_LIMITS = {
  maxEntries: 5_000,
  maxEntryBytes: 5 * 1024 * 1024,
  maxTotalBytes: 100 * 1024 * 1024,
  maxArchiveBytes: 100 * 1024 * 1024,
} as const;

export type ImportErrorCode =
  | "invalid-zip"
  | "archive-too-large"
  | "too-many-files"
  | "file-too-large"
  | "unsafe-path"
  | "unsupported-file"
  | "invalid-text"
  | "nothing-to-import";

export class ImportError extends Error {
  constructor(
    public readonly code: ImportErrorCode,
    /** The offending file or limit, for the message shown to the user. */
    public readonly detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "ImportError";
  }
}

export type ImportStrategy =
  /** Every note gets a new id, so nothing local is touched. */
  | "new"
  /** Notes whose id already exists replace the local copy if they're newer. */
  | "merge-newer"
  /** Notes whose id already exists are left alone; only unknown ids are added. */
  | "merge-skip";

export type ParsedNote = {
  id?: string;
  title?: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
  folderPath: string[];
};

export type ParsedImport = {
  /** Every directory named in the archive, so empty folders come back too. */
  folders: string[][];
  notes: ParsedNote[];
};

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  foldersCreated: number;
  /** Notes that were written and so need (re)indexing. */
  indexedNoteIds: string[];
};

export type ImportProgress = { done: number; total: number };

export type ImportSourceFile = Pick<File, "name" | "size" | "arrayBuffer">;

const TEXT_FILE = /\.(md|markdown|txt)$/i;
const IGNORED_FILE = /^(\.ds_store|thumbs\.db|desktop\.ini)$/i;
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

/**
 * Normalises an archive path into safe segments. Anything that could escape
 * the import root (zip-slip) is rejected instead of silently repaired.
 */
export function safePathSegments(name: string): string[] {
  const path = name.replaceAll("\\", "/");
  if (
    path.includes("\0") ||
    path.startsWith("/") ||
    /^[a-zA-Z]:/.test(path) ||
    path.split("/").includes("..")
  ) {
    throw new ImportError("unsafe-path", name);
  }
  return path.split("/").filter((segment) => segment && segment !== ".");
}

function isIgnored(segments: string[]) {
  return (
    segments[0] === "__MACOSX" ||
    IGNORED_FILE.test(segments[segments.length - 1] ?? "")
  );
}

type RawEntry = { segments: string[]; bytes: Uint8Array; isDirectory: boolean };

function unzipEntries(data: Uint8Array): RawEntry[] {
  const entries: RawEntry[] = [];
  const meta = new Map<string, { segments: string[]; isDirectory: boolean }>();
  let count = 0;
  let total = 0;

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data, {
      // Runs on the central directory, before anything is inflated.
      filter: ({ name, originalSize }) => {
        const segments = safePathSegments(name);
        if (segments.length === 0 || isIgnored(segments)) return false;
        const isDirectory = name.endsWith("/") || name.endsWith("\\");
        if (++count > IMPORT_LIMITS.maxEntries) {
          throw new ImportError(
            "too-many-files",
            String(IMPORT_LIMITS.maxEntries),
          );
        }
        if (originalSize > IMPORT_LIMITS.maxEntryBytes) {
          throw new ImportError("file-too-large", name);
        }
        total += originalSize;
        if (total > IMPORT_LIMITS.maxTotalBytes) {
          throw new ImportError("archive-too-large");
        }
        if (!isDirectory && !TEXT_FILE.test(segments[segments.length - 1])) {
          throw new ImportError("unsupported-file", name);
        }
        meta.set(name, { segments, isDirectory });
        return true;
      },
    });
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError("invalid-zip");
  }

  for (const [name, bytes] of Object.entries(files)) {
    const info = meta.get(name);
    if (info) entries.push({ ...info, bytes });
  }
  return entries;
}

function decodeText(bytes: Uint8Array, name: string) {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ImportError("invalid-text", name);
  }
  if (text.includes("\0")) throw new ImportError("invalid-text", name);
  return text;
}

function toParsedNote(
  text: string,
  fileName: string,
  folderPath: string[],
): ParsedNote {
  const { metadata, content } = parseNoteFile(text);
  if (metadata) return { ...metadata, content, folderPath };
  // A plain Markdown file: the file name is the best title we have.
  const stem = fileName.replace(/\.[^.]+$/, "").trim();
  return {
    title: stem.slice(0, NOTE_TITLE_MAX_LENGTH).trim() || undefined,
    content,
    folderPath,
  };
}

/**
 * Reads the chosen files (ZIP archives and/or loose Markdown files) into notes
 * and folders. Nothing is written: the whole selection is validated first, so
 * a rejected file never leaves a half-imported library behind.
 */
export async function parseImportFiles(
  files: ImportSourceFile[],
): Promise<ParsedImport> {
  const parsed: ParsedImport = { folders: [], notes: [] };
  let looseCount = 0;

  for (const file of files) {
    if (file.size > IMPORT_LIMITS.maxArchiveBytes) {
      throw new ImportError("archive-too-large", file.name);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isZip =
      /\.zip$/i.test(file.name) || ZIP_MAGIC.every((b, i) => bytes[i] === b);

    if (isZip) {
      for (const { segments, bytes: data, isDirectory } of unzipEntries(
        bytes,
      )) {
        if (isDirectory) {
          parsed.folders.push(segments);
          continue;
        }
        const name = segments.join("/");
        parsed.notes.push(
          toParsedNote(
            decodeText(data, name),
            segments[segments.length - 1],
            segments.slice(0, -1),
          ),
        );
      }
      continue;
    }

    if (!TEXT_FILE.test(file.name)) {
      throw new ImportError("unsupported-file", file.name);
    }
    if (++looseCount > IMPORT_LIMITS.maxEntries) {
      throw new ImportError("too-many-files", String(IMPORT_LIMITS.maxEntries));
    }
    if (file.size > IMPORT_LIMITS.maxEntryBytes) {
      throw new ImportError("file-too-large", file.name);
    }
    parsed.notes.push(
      toParsedNote(decodeText(bytes, file.name), file.name, []),
    );
  }

  if (parsed.notes.length === 0 && parsed.folders.length === 0) {
    throw new ImportError("nothing-to-import");
  }
  return parsed;
}

/**
 * Writes parsed notes and folders into the local database in one transaction.
 * Folders are matched by name under their parent (case-insensitively, like the
 * folders DAL) and created through it when missing.
 */
export async function applyImport(
  parsed: ParsedImport,
  strategy: ImportStrategy,
  onProgress?: (progress: ImportProgress) => void,
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    foldersCreated: 0,
    indexedNoteIds: [],
  };

  await db.transaction("rw", db.folders, db.notes, async () => {
    const known = (await db.folders.toArray()).map(
      ({ id, name, parentId }) => ({ id, name, parentId }),
    );
    const resolved = new Map<string, string | null>();

    const ensureFolder = async (path: string[]) => {
      let parentId: string | null = null;
      let key = "";
      for (const segment of path) {
        const name = segment.trim().slice(0, FOLDER_NAME_MAX_LENGTH).trim();
        if (!name) continue;
        key += `/${folderNameKey(name)}`;
        let id: string | null | undefined = resolved.get(key);
        if (id === undefined) {
          const match = known.find(
            (f) =>
              f.parentId === parentId &&
              folderNameKey(f.name) === folderNameKey(name),
          );
          id = match?.id;
          if (!id) {
            id = await createFolder({ name, parentId });
            known.push({ id, name, parentId });
            result.foldersCreated++;
          }
          resolved.set(key, id);
        }
        parentId = id;
      }
      return parentId;
    };

    for (const path of parsed.folders) await ensureFolder(path);

    const total = parsed.notes.length;
    for (const [index, item] of parsed.notes.entries()) {
      const existing =
        strategy !== "new" && item.id ? await db.notes.get(item.id) : undefined;

      const overwrite =
        existing !== undefined &&
        strategy === "merge-newer" &&
        item.updatedAt !== undefined &&
        item.updatedAt.getTime() > existing.updatedAt.getTime();

      if (existing && !overwrite) {
        result.skipped++;
      } else {
        const now = new Date();
        const createdAt = item.createdAt ?? existing?.createdAt ?? now;
        const note: Note = {
          id:
            existing?.id ??
            (strategy !== "new" && item.id ? item.id : crypto.randomUUID()),
          title: item.title,
          content: item.content,
          folderId: (await ensureFolder(item.folderPath)) ?? undefined,
          deleted: 0,
          createdAt,
          updatedAt: item.updatedAt ?? createdAt,
        };
        await db.notes.put(note);
        result.indexedNoteIds.push(note.id);
        if (existing) result.updated++;
        else result.created++;
      }
      onProgress?.({ done: index + 1, total });
    }
  });

  return result;
}
