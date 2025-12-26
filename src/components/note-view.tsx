"use client";

import markdownToTxt from "markdown-to-txt";
import { Activity, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  addNote,
  updateNoteContent,
  useNoteById,
} from "@/client-data/notes-dal";
import { HighlightedSnippet } from "@/components/highlighted-snippet";
import { NoteEditorForm } from "@/components/note-editor-form";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSummarizationWorker } from "@/hooks/use-summarization-worker";
import type { SearchHighlightPayload } from "@/lib/search-highlight";
import { useEmbedderService } from "@/providers/embedder-service-provider";

interface NoteViewProps {
  noteId?: string;
  highlight?: SearchHighlightPayload;
}

export function NoteView({ noteId, highlight }: NoteViewProps) {
  const [currentNoteId, setCurrentNoteId] = useState(noteId);
  const [isSaving, setIsSaving] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const { data: note, isLoading } = useNoteById(currentNoteId);
  const embedder = useEmbedderService();
  const { summarize, isReady: isSummarizerReady } = useSummarizationWorker();

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

  useEffect(() => {
    setSummary(null);
  }, [currentNoteId]);

  const handleSummarize = useCallback(async () => {
    if (!note?.content || !note.content.trim()) {
      toast.info("Add some content before summarizing.", {
        position: "top-center",
      });
      return;
    }

    if (!isSummarizerReady) {
      toast.info("The summarization model is still loading.", {
        position: "top-center",
      });
      return;
    }

    try {
      setIsSummarizing(true);
      const summaryText = await summarize(markdownToTxt(note.content));
      setSummary(summaryText);
    } catch (err) {
      const description =
        err instanceof Error ? err.message : "An unknown error occurred.";
      toast.error("Could not summarize this note.", {
        description,
        position: "top-center",
      });
    } finally {
      setIsSummarizing(false);
    }
  }, [isSummarizerReady, note?.content, summarize]);

  const canSummarize = !!note?.content?.trim();

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
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isSummarizing || !canSummarize || !isSummarizerReady}
            onClick={handleSummarize}
          >
            {isSummarizing && <Spinner className="mr-2" />}
            {isSummarizing ? "Summarizing..." : "Summarize note"}
          </Button>
          <Activity mode={isCreatingNote ? "hidden" : "visible"}>
            <p className="text-muted-foreground text-sm">
              {isSaving ? "Saving..." : "All changes saved."}
            </p>
          </Activity>
        </div>
        {summary && (
          <div className="border-primary/30 bg-primary/5 text-foreground/90 mt-4 rounded-2xl border px-4 py-3 text-sm shadow-sm">
            <p className="text-primary mb-2 text-xs font-semibold tracking-[0.25em] uppercase">
              AI Summary
            </p>
            <p className="leading-relaxed whitespace-pre-line">{summary}</p>
          </div>
        )}
      </Activity>
    </section>
  );
}
