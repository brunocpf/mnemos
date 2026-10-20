import { FolderError, FolderErrorCode } from "@/client-data/folders-dal";

/** The `Folders.errors.*` message key for a failed folder operation. */
export function folderErrorKey(error: unknown): FolderErrorCode | "unknown" {
  if (error instanceof FolderError) return error.code;
  console.error("Folder operation failed", error);
  return "unknown";
}
