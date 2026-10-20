import { useLiveQuery } from "dexie-react-hooks";
import {
  addTransitionType,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";

import { db } from "@/client-data/db";
import { Note } from "@/client-data/note";
import { useFolders } from "@/hooks/use-folders";
import { SemanticMatch, useSemanticSearch } from "@/hooks/use-semantic-search";

const loadingSymbol = Symbol("loading");

export type NoteEntry = {
  note: Note;
  match?: SemanticMatch;
};

/**
 * Notes for the list. Without a search the list is scoped to `folderId`
 * (`null` = root, `undefined` = every folder). Search is always global.
 */
export function useNotes(search: string, folderId?: string | null) {
  const [isLoading, setIsLoading] = useState(true);
  const allNotes = useLiveQuery(
    () => db.notes.where("deleted").equals(0).reverse().sortBy("updatedAt"),
    [],
    loadingSymbol,
  );
  const folders = useFolders();
  const {
    matches,
    isSearching,
    error: searchError,
    isReady,
  } = useSemanticSearch(search);

  const normalizedNotes = useMemo(() => {
    return allNotes === loadingSymbol ? undefined : allNotes;
  }, [allNotes]);

  const scopedNotes = useMemo(() => {
    if (!normalizedNotes || folderId === undefined) return normalizedNotes;
    if (folderId !== null) {
      return normalizedNotes.filter((note) => note.folderId === folderId);
    }
    if (!folders) return undefined;
    // A note pointing at a folder that no longer exists is shown at the root
    // rather than becoming unreachable.
    const folderIds = new Set(folders.map((folder) => folder.id));
    return normalizedNotes.filter(
      (note) => !note.folderId || !folderIds.has(note.folderId),
    );
  }, [normalizedNotes, folders, folderId]);

  const noteMap = useMemo(() => {
    if (!normalizedNotes) return new Map<string, Note>();
    return new Map(normalizedNotes.map((note) => [note.id, note]));
  }, [normalizedNotes]);

  const filteredNotes: NoteEntry[] | undefined = useMemo(() => {
    if (!search) return scopedNotes?.map((note) => ({ note }));
    return matches
      .map((match) => {
        const note = noteMap.get(match.noteId);
        if (!note) return null;
        return { note, match } as NoteEntry;
      })
      .filter((entry): entry is NoteEntry => Boolean(entry));
  }, [matches, scopedNotes, noteMap, search]);

  useEffect(() => {
    const dbIsLoading = allNotes === loadingSymbol || !scopedNotes;
    const newIsLoading =
      dbIsLoading || isSearching || (Boolean(search) && !isReady);

    if (isLoading !== newIsLoading) {
      startTransition(() => {
        addTransitionType("notes-loading-state");

        setIsLoading(newIsLoading);
      });
    }
  }, [allNotes, scopedNotes, isLoading, isSearching, isReady, search]);

  return {
    data: filteredNotes,
    isLoading,
    error: searchError,
  };
}
