import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/client-data/db";
import { Folder } from "@/client-data/folder";

const loadingSymbol = Symbol("loading");

/** All folders; `undefined` while the first read is in flight. */
export function useFolders(): Folder[] | undefined {
  const folders = useLiveQuery(() => db.folders.toArray(), [], loadingSymbol);
  return folders === loadingSymbol ? undefined : folders;
}
