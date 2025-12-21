"use client";

import { useNotes } from "@/client-data/notes-dal";
import { NoteListItem } from "@/components/note-list-item";

export function NoteList() {
  const { data: notes } = useNotes();

  const hasNotes = !!notes?.length;

  if (!hasNotes) {
    return (
      <div className="border-border/60 text-muted-foreground dark:bg-background/80 rounded-2xl border border-dashed bg-white/80 px-6 py-10 text-center text-sm shadow-inner">
        No notes yet. Start writing to see them here.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {notes?.map((note) => (
        <li key={note.id}>
          <NoteListItem note={note} />
        </li>
      ))}
    </ul>
  );
}
