import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/client-data/db";
import { Note } from "@/client-data/note";

const loadingSymbol = Symbol("loading");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useNotes(search: string): {
  data?: Note[];
  isLoading: boolean;
  error: Error | null;
} {
  const allNotes = useLiveQuery(
    () => db.notes.where("deleted").equals(0).toArray(),
    [],
    loadingSymbol,
  );

  const dbIsLoading = allNotes === loadingSymbol;

  const isLoading = dbIsLoading;

  return {
    data: allNotes === loadingSymbol ? undefined : allNotes,
    isLoading,
    error: null,
  };
}
