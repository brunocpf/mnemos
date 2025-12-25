"use client";

import { Activity, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  addNote,
  updateNoteContent,
  useNoteById,
} from "@/client-data/notes-dal";
import { HighlightedSnippet } from "@/components/highlighted-snippet";
import { NoteEditorForm } from "@/components/note-editor-form";
import type { SearchHighlightPayload } from "@/lib/search-highlight";
import { useEmbedderService } from "@/providers/embedder-service-provider";

interface NoteViewProps {
  noteId?: string;
  highlight?: SearchHighlightPayload;
}

export function NoteView({ noteId, highlight }: NoteViewProps) {
  const [currentNoteId, setCurrentNoteId] = useState(noteId);
  const [isSaving, setIsSaving] = useState(false);
  const { data: note, isLoading } = useNoteById(currentNoteId);
  const embedder = useEmbedderService();

  const isCreatingNote = !currentNoteId;
  const noteDoesNotExist = !isLoading && !isCreatingNote && !note;
  const shouldShowEditor = !noteId || (!isLoading && !noteDoesNotExist);
  const highlightForNote = useMemo(() => {
    if (!highlight) return undefined;
    if (!currentNoteId) return undefined;
    return highlight.noteId === currentNoteId ? highlight : undefined;
  }, [currentNoteId, highlight]);

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

        embedder.schedule({
          id: noteIdToPersist,
          title: note?.title,
          content: value,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onBlur = (noteId: string | undefined, content: string) => {
    if (!noteId) return;

    embedder.flush({
      id: noteId,
      title: note?.title,
      content: content,
    });
  };

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
      <Activity mode={!!noteId && noteDoesNotExist ? "visible" : "hidden"}>
        <h1 className="text-3xl font-semibold">Note not found</h1>
        <p className="text-muted-foreground">
          It may have been deleted or never existed.
        </p>
      </Activity>
      <Activity mode={shouldShowEditor ? "visible" : "hidden"}>
        {highlightForNote && (
          <div className="border-primary/20 bg-primary/5 text-foreground/90 mb-4 rounded-2xl border px-4 py-3 text-sm">
            <p className="text-primary mb-2 text-xs font-semibold tracking-[0.2em] uppercase">
              Search match
            </p>
            <HighlightedSnippet
              text={highlightForNote.snippet}
              highlights={highlightForNote.highlights}
              leadingEllipsis={highlightForNote.leadingEllipsis}
              trailingEllipsis={highlightForNote.trailingEllipsis}
            />
          </div>
        )}
        <NoteEditorForm
          key={noteId ? (note?.id ?? "unloaded-note") : "new-note"}
          noteId={currentNoteId}
          initialContent={note?.content ?? ""}
          onChange={handlePersist}
          onBlur={onBlur}
          highlightTerms={highlightForNote?.terms}
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
