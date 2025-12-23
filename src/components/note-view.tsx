"use client";

import { Activity, useState } from "react";
import { toast } from "sonner";

import {
  addNote,
  updateNoteContent,
  useNoteById,
} from "@/client-data/notes-dal";
import { NoteEditorForm } from "@/components/note-editor-form";

interface NoteViewProps {
  noteId?: string;
}

export function NoteView({ noteId }: NoteViewProps) {
  const [currentNoteId, setCurrentNoteId] = useState(noteId);
  const [isSaving, setIsSaving] = useState(false);
  const { data: note, isLoading } = useNoteById(currentNoteId);

  const isCreatingNote = currentNoteId === undefined;
  const noteDoesNotExist = !isLoading && !isCreatingNote && note === undefined;
  const shouldShowEditor = !isLoading && !noteDoesNotExist;

  const handlePersist = async (
    noteIdToPersist: string | undefined,
    value: string,
  ) => {
    try {
      setIsSaving(true);

      if (!noteIdToPersist && value.trim() !== "") {
        const newId = await addNote({
          content: value,
        });
        toast.info("Note created", { position: "top-center" });
        setCurrentNoteId(newId);
      } else if (noteIdToPersist) {
        await updateNoteContent(noteIdToPersist, value);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
      <Activity mode={noteDoesNotExist ? "visible" : "hidden"}>
        <h1 className="text-3xl font-semibold">Note not found</h1>
        <p className="text-muted-foreground">
          It may have been deleted or never existed.
        </p>
      </Activity>
      <Activity mode={shouldShowEditor ? "visible" : "hidden"}>
        <NoteEditorForm
          key={noteId ? (note?.id ?? "unloaded-note") : "new-note"}
          noteId={currentNoteId}
          initialContent={note?.content ?? ""}
          onPersist={handlePersist}
        />
        <div>
          <Activity mode={isCreatingNote ? "hidden" : "visible"}>
            <p className="text-muted-foreground text-sm">
              {isSaving ? "Saving..." : "All changes saved."}
            </p>
          </Activity>
        </div>
      </Activity>
    </section>
  );
}
