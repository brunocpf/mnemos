"use client";

import { ReactNode, useMemo } from "react";

import type { Note } from "@/client-data/note";
import { useNotes } from "@/client-data/notes-dal";
import { NoteListItem } from "@/components/note-list-item";
import { Spinner } from "@/components/ui/spinner";
import type { SemanticMatch } from "@/hooks/use-semantic-search";

interface NoteListProps {
  searchQuery: string;
  matches: SemanticMatch[];
  isSearching: boolean;
  error: Error | null;
}

export function NoteList({
  searchQuery,
  matches,
  isSearching,
  error,
}: NoteListProps) {
  const { data: notes, isLoading } = useNotes();

  const trimmedQuery = searchQuery.trim();
  const noteMap = useMemo(() => {
    if (!notes) return new Map<string, Note>();
    return new Map(notes.map((note) => [note.id, note]));
  }, [notes]);

  const searchNotes = useMemo(() => {
    if (!trimmedQuery) return [];
    return matches
      .map((match) => noteMap.get(match.noteId))
      .filter((note): note is Note => Boolean(note));
  }, [matches, noteMap, trimmedQuery]);

  if (isLoading) {
    return (
      <EmptyState>
        <div className="flex items-center justify-center gap-2">
          <Spinner />
          <span>Loading your notes...</span>
        </div>
      </EmptyState>
    );
  }

  if (trimmedQuery) {
    if (error) {
      return (
        <EmptyState>Unable to run semantic search. {error.message}</EmptyState>
      );
    }

    if (isSearching) {
      return (
        <EmptyState>
          <div className="flex items-center justify-center gap-2">
            <Spinner />
            <span>Searching notes...</span>
          </div>
        </EmptyState>
      );
    }

    if (!searchNotes.length) {
      return (
        <EmptyState>
          {`No notes matched "${trimmedQuery}". Try a different phrase.`}
        </EmptyState>
      );
    }

    return <NotesList notes={searchNotes} />;
  }

  if (!notes?.length) {
    return (
      <EmptyState>No notes yet. Start writing to see them here.</EmptyState>
    );
  }

  return <NotesList notes={notes} />;
}

function NotesList({ notes }: { notes: Note[] }) {
  return (
    <ul className="space-y-3">
      {notes.map((note) => (
        <li key={note.id}>
          <NoteListItem note={note} />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="border-border/60 text-muted-foreground dark:bg-background/80 rounded-2xl border border-dashed bg-white/80 px-6 py-10 text-center text-sm shadow-inner">
      {children}
    </div>
  );
}
