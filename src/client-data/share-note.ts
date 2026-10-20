import { createNote } from "@/client-data/notes-dal";
import { buildSharedContent, SharedParams } from "@/lib/shared-content";

/**
 * Saves content received through the Web Share Target as a new note.
 * Resolves to the new note id, or `undefined` when nothing was shared.
 */
export async function createNoteFromShare(params: SharedParams) {
  const content = buildSharedContent(params);
  if (!content) return undefined;
  return await createNote({ content });
}
