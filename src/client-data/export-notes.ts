import { strToU8, zipSync } from "fflate";

import { db } from "@/client-data/db";
import { buildFolderTree, type FolderNode } from "@/lib/folder-tree";
import {
  claimUniqueName,
  noteFileStem,
  sanitizePathSegment,
  serializeNoteFile,
} from "@/lib/note-markdown";

export type ExportProgress = { done: number; total: number };

export type NotesArchive = {
  bytes: Uint8Array<ArrayBuffer>;
  noteCount: number;
  folderCount: number;
};

export function exportFileName(date = new Date()) {
  return `mnemos-export-${date.toISOString().slice(0, 10)}.zip`;
}

/**
 * Builds a ZIP of every non-deleted note, entirely in memory on this device.
 * Folders become directories (empty ones included, as directory entries) and
 * each note a `.md` file whose front matter keeps its id and timestamps.
 */
export async function buildNotesArchive(
  onProgress?: (progress: ExportProgress) => void,
): Promise<NotesArchive> {
  const [folders, allNotes] = await Promise.all([
    db.folders.toArray(),
    db.notes.where("deleted").equals(0).toArray(),
  ]);
  const notes = allNotes.toSorted(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const total = notes.length;

  const files: Record<string, Uint8Array> = {};
  // Names already used per directory ("" is the root), shared by folders and
  // notes so a note can never overwrite a directory entry or another note.
  const takenByDir = new Map<string, Set<string>>();
  const takenIn = (dir: string) => {
    let taken = takenByDir.get(dir);
    if (!taken) takenByDir.set(dir, (taken = new Set()));
    return taken;
  };
  const dirById = new Map<string, string>();

  const addDirectories = (nodes: FolderNode[], parentDir: string) => {
    for (const { folder, children } of nodes) {
      const name = claimUniqueName(
        takenIn(parentDir),
        sanitizePathSegment(folder.name, { fallback: "Folder" }),
      );
      const dir = parentDir ? `${parentDir}/${name}` : name;
      dirById.set(folder.id, dir);
      files[`${dir}/`] = new Uint8Array(0);
      addDirectories(children, dir);
    }
  };
  addDirectories(buildFolderTree(folders), "");

  notes.forEach((note, index) => {
    const dir = (note.folderId && dirById.get(note.folderId)) || "";
    const name = claimUniqueName(takenIn(dir), noteFileStem(note), ".md");
    files[dir ? `${dir}/${name}` : name] = strToU8(serializeNoteFile(note));
    onProgress?.({ done: index + 1, total });
  });

  return {
    bytes: zipSync(files) as Uint8Array<ArrayBuffer>,
    noteCount: notes.length,
    folderCount: folders.length,
  };
}
