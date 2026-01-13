"use client";

import { Activity, useState, ViewTransition } from "react";

import { createNote, updateNote } from "@/client-data/notes-dal";
import { NoteEditorForm } from "@/components/note-editor-form";
import { Spinner } from "@/components/ui/spinner";
import { useNoteById } from "@/hooks/use-note-by-id";

export interface NoteViewProps {
  noteId?: string;
}

export default function NoteView({ noteId }: NoteViewProps) {
  const [currentNoteId, setCurrentNoteId] = useState(() => noteId);
  const { data: noteData, isLoading: noteIsLoading } = useNoteById(
    currentNoteId ?? "",
  );

  const showLoading = !!noteId && noteIsLoading;
  const noteDoesNotExist = !!noteId && !noteIsLoading && !noteData;
  const showEditor = !showLoading && !noteDoesNotExist;

  const handlePersist = async (
    noteIdToPersist: string | undefined,
    value: string,
  ) => {
    if (!noteIdToPersist && value.trim() !== "") {
      noteIdToPersist = await createNote({
        content: value,
      });
      setCurrentNoteId(noteIdToPersist);
    } else if (noteIdToPersist) {
      await updateNote(noteIdToPersist, { content: value });
    }

    // trigger scheduled embedding here
  };

  const handleBlur = () => {
    // trigger embedding flush
  };

  return (
    <div className="flex flex-col gap-6">
      <ViewTransition>
        <Activity mode={showLoading ? "visible" : "hidden"}>
          <div className="flex items-center gap-2 opacity-100 delay-500 starting:opacity-0">
            <Spinner />
            <span>Loading note...</span>
          </div>
        </Activity>
        <Activity mode={noteDoesNotExist ? "visible" : "hidden"}>
          <h1 className="text-3xl font-semibold">Note not found</h1>
          <p className="text-muted-foreground">
            It may have been deleted or never existed.
          </p>
        </Activity>
        <Activity mode={showEditor ? "visible" : "hidden"}>
          <NoteEditorForm
            key={noteId ? (noteData?.id ?? "unloaded-note") : "new-note"}
            noteId={currentNoteId}
            initialContent={noteData?.content ?? ""}
            onChange={handlePersist}
            onBlur={handleBlur}
          />
        </Activity>
      </ViewTransition>
    </div>
  );
}
