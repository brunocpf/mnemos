import { useLiveQuery } from "dexie-react-hooks";
import { startTransition, useEffect, useMemo, useState } from "react";

import { db } from "@/client-data/db";
import { Note } from "@/client-data/note";
import { SemanticMatch, useSemanticSearch } from "@/hooks/use-semantic-search";

const loadingSymbol = Symbol("loading");

export type NoteEntry = {
  note: Note;
  match?: SemanticMatch;
};

export function useNotes(search: string) {
  const [isLoading, setIsLoading] = useState(true);
  const allNotes = useLiveQuery(
    () => db.notes.where("deleted").equals(0).reverse().sortBy("updatedAt"),
    [],
    loadingSymbol,
  );
  const {
    matches,
    isSearching,
    error: searchError,
    isReady,
  } = useSemanticSearch(search);

  const normalizedNotes = useMemo(() => {
    return allNotes === loadingSymbol ? undefined : allNotes;
  }, [allNotes]);

  const noteMap = useMemo(() => {
    if (!normalizedNotes) return new Map<string, Note>();
    return new Map(normalizedNotes.map((note) => [note.id, note]));
  }, [normalizedNotes]);

  const filteredNotes: NoteEntry[] | undefined = useMemo(() => {
    if (!search) return normalizedNotes?.map((note) => ({ note }));
    return matches
      .map((match) => {
        const note = noteMap.get(match.noteId);
        if (!note) return null;
        return { note, match } as NoteEntry;
      })
      .filter((entry): entry is NoteEntry => Boolean(entry));
  }, [matches, normalizedNotes, noteMap, search]);

  useEffect(() => {
    const dbIsLoading = allNotes === loadingSymbol;
    const newIsLoading =
      dbIsLoading || isSearching || (Boolean(search) && !isReady);

    if (isLoading !== newIsLoading) {
      startTransition(() => {
        setIsLoading(newIsLoading);
      });
    }
  }, [allNotes, isLoading, isSearching, isReady, search]);

  return {
    data: filteredNotes,
    isLoading,
    error: searchError,
  };
}
