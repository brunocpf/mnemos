"use client";

import { useDebounce } from "@/hooks/use-debounce";
import { useNotes } from "@/hooks/use-notes";
import { useSearchValue } from "@/providers/search-value-provider";

export default function NotesList() {
  const { searchValue } = useSearchValue();
  const debouncedSearchValue = useDebounce(searchValue, 200);
  const { data: notes, isLoading, error } = useNotes(debouncedSearchValue);

  return (
    <div className="border-border/60 text-muted-foreground dark:bg-background/80 rounded-2xl border border-dashed bg-white/80 px-6 py-10 text-center text-sm shadow-inner">
      {isLoading && <div>Loading notes...</div>}
      {error && <div>Error loading notes: {error.message}</div>}
      {!isLoading && !error && notes && notes.length === 0 && (
        <div>No notes yet. Start writing to see them here.</div>
      )}
      {!isLoading && !error && notes && notes.length > 0 && (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id}>{note.content}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
