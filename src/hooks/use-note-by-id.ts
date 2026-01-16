import { useLiveQuery } from "dexie-react-hooks";
import { addTransitionType, startTransition, useEffect, useState } from "react";

import { db } from "@/client-data/db";
import { Note } from "@/client-data/note";

const loadingSymbol = Symbol("loading");

export function useNoteById(noteId: string): {
  data?: Note;
  isLoading: boolean;
} {
  const [isLoading, setIsLoading] = useState(true);
  const note = useLiveQuery(() => db.notes.get(noteId), [], loadingSymbol);

  useEffect(() => {
    const dbIsLoading = note === loadingSymbol;

    if (isLoading !== dbIsLoading) {
      startTransition(() => {
        addTransitionType("note-loading-state");

        setIsLoading(dbIsLoading);
      });
    }
  }, [isLoading, note]);

  return {
    data: note === loadingSymbol || !!note?.deleted ? undefined : note,
    isLoading,
  };
}
