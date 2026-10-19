"use client";

import { IconSparkles2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import {
  Activity,
  useEffect,
  useMemo,
  useRef,
  useState,
  ViewTransition,
} from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";

import { createNote, updateNote } from "@/client-data/notes-dal";
import { AppHeaderContentSlot } from "@/components/app-header-content-slot";
import { HighlightedSnippet } from "@/components/highlighted-snippet";
import { NoteEditorForm } from "@/components/note-editor-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useNoteById } from "@/hooks/use-note-by-id";
import { Link } from "@/i18n/navigation";
import { SearchHighlightPayload } from "@/lib/search-highlight";
import { useEmbedder } from "@/providers/embedder-provider";
import { useSummarizer } from "@/providers/summarizer-provider";

export interface NoteViewProps {
  noteId?: string;
  highlight?: SearchHighlightPayload;
}

export function NoteView({ noteId, highlight }: NoteViewProps) {
  const t = useTranslations("NoteView");
  const { summarize, isReady: summarizerIsReady } = useSummarizer();
  const { schedule, flush, isReady: embedderIsReady } = useEmbedder();
  const [currentNoteId, setCurrentNoteId] = useState(() => noteId);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [becameReadyWhileDialogOpen, setBecameReadyWhileDialogOpen] =
    useState(false);
  const lastSummarizerIsReadyRef = useRef(summarizerIsReady);
  const [summaryState, setSummaryState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; host: "local" | "server"; result: string }
    | { status: "error"; error: string }
  >({ status: "idle" });
  const { data: noteData, isLoading: noteIsLoading } = useNoteById(
    currentNoteId ?? "",
  );

  const showLoading = !!noteId && noteIsLoading;
  const noteDoesNotExist = !!noteId && !noteIsLoading && !noteData;
  const showEditor = !showLoading && !noteDoesNotExist;
  const highlightForNote = useMemo(() => {
    if (!highlight) return undefined;
    if (!currentNoteId) return undefined;
    return highlight.noteId === currentNoteId ? highlight : undefined;
  }, [currentNoteId, highlight]);

  const canSummarize = !!noteData?.content?.trim();

  useEffect(() => {
    if (!isSummaryDialogOpen) return;

    const wasReady = lastSummarizerIsReadyRef.current;
    if (!wasReady && summarizerIsReady && summaryState.status === "idle") {
      setTimeout(() => {
        setBecameReadyWhileDialogOpen(true);
      }, 0);
    }

    lastSummarizerIsReadyRef.current = summarizerIsReady;
  }, [summarizerIsReady, isSummaryDialogOpen, summaryState.status]);

  const handleSummaryDialogOpenChange = (open: boolean) => {
    setIsSummaryDialogOpen(open);

    if (!open) {
      setBecameReadyWhileDialogOpen(false);
    }

    lastSummarizerIsReadyRef.current = summarizerIsReady;
  };

  const handleSummarize = async () => {
    if (!noteData || !canSummarize) return;

    setIsSummaryDialogOpen(true);
    setBecameReadyWhileDialogOpen(false);

    if (!summarizerIsReady) {
      setSummaryState({ status: "idle" });
      return;
    }

    try {
      setSummaryState({ status: "loading" });
      const response = await summarize(noteData.content);

      if (response.status === "success" && response.result) {
        setSummaryState({
          status: "success",
          host: response.host,
          result: response.result,
        });
      } else if (response.status === "error") {
        console.error("Summarization failed", response.error);
        setSummaryState({
          status: "error",
          error: t("dialogs.summary.errorFallback"),
        });
      }
    } catch (error: unknown) {
      console.error("Summarization failed", error);
      setSummaryState({
        status: "error",
        error: t("dialogs.summary.errorFallback"),
      });
    }
  };

  const handlePersist = async (
    noteIdToPersist: string | undefined,
    value: string,
  ) => {
    if (!noteIdToPersist && value.trim() !== "") {
      noteIdToPersist = await createNote({
        content: value,
      });
      setCurrentNoteId(noteIdToPersist);
      toast.success(t("toasts.noteCreated"), { position: "top-center" });
    } else if (noteIdToPersist) {
      const contentChanged = noteData?.content !== value;
      if (contentChanged) {
        await updateNote(noteIdToPersist, { content: value });
      }
    }

    if (noteIdToPersist && embedderIsReady) {
      schedule({ id: noteIdToPersist, content: value });
    }
  };

  const handleBlur = () => {
    if (currentNoteId && embedderIsReady) {
      flush({ id: currentNoteId, content: noteData?.content ?? "" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ViewTransition>
        <Activity mode={showLoading ? "visible" : "hidden"}>
          <div className="flex items-center gap-2 opacity-100 delay-500 starting:opacity-0">
            <Spinner />
            <span>{t("loading.note")}</span>
          </div>
        </Activity>
        <Activity mode={noteDoesNotExist ? "visible" : "hidden"}>
          <h1 className="text-3xl font-semibold">
            {t("errors.notFound.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("errors.notFound.description")}
          </p>
        </Activity>
        <Activity mode={showEditor ? "visible" : "hidden"}>
          {highlightForNote && (
            <div className="border-primary/20 bg-primary/5 text-foreground/90 mb-4 rounded-2xl border px-4 py-3 text-sm">
              <p className="text-primary mb-2 text-xs font-semibold tracking-[0.2em] uppercase">
                {t("searchMatch")}
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
            key={noteId ? (noteData?.id ?? "unloaded-note") : "new-note"}
            noteId={currentNoteId}
            initialContent={noteData?.content ?? ""}
            onChange={handlePersist}
            onBlur={handleBlur}
            highlightTerms={highlightForNote?.terms}
          />
        </Activity>
      </ViewTransition>
      <AppHeaderContentSlot>
        <div
          className={
            canSummarize
              ? "inline-flex rounded-4xl bg-linear-to-r from-red-500 via-yellow-500 to-blue-500 p-px"
              : "bg-muted inline-flex rounded-4xl p-px"
          }
        >
          <Button disabled={!canSummarize} onClick={handleSummarize}>
            <IconSparkles2 />
            {t("actions.summarize")}
          </Button>
        </div>
      </AppHeaderContentSlot>

      <Dialog
        open={isSummaryDialogOpen}
        onOpenChange={handleSummaryDialogOpenChange}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogs.summary.title")}</DialogTitle>
            <ViewTransition>
              <Activity mode={!summarizerIsReady ? "visible" : "hidden"}>
                <DialogDescription>
                  {t("dialogs.summary.unavailable")}{" "}
                  <Link href="/settings">
                    {t("dialogs.summary.openSettings")}
                  </Link>
                </DialogDescription>
              </Activity>
              <Activity
                mode={
                  becameReadyWhileDialogOpen && summaryState.status === "idle"
                    ? "visible"
                    : "hidden"
                }
              >
                <DialogDescription>
                  {t("dialogs.summary.availableNow")}
                </DialogDescription>
              </Activity>
              <Activity
                mode={summaryState.status === "loading" ? "visible" : "hidden"}
              >
                <DialogDescription className="flex items-center gap-2">
                  <Spinner />
                  <span>{t("dialogs.summary.loading")}</span>
                </DialogDescription>
              </Activity>
              <Activity
                mode={summaryState.status === "error" ? "visible" : "hidden"}
              >
                <DialogDescription>
                  {summaryState.status === "error" ? summaryState.error : ""}
                </DialogDescription>
              </Activity>
            </ViewTransition>
          </DialogHeader>
          <ViewTransition>
            <Activity
              mode={
                summarizerIsReady && summaryState.status === "success"
                  ? "visible"
                  : "hidden"
              }
            >
              <div className="grid gap-3">
                <div className="prose prose-sm dark:prose-invert prose-headings:mt-6 prose-headings:font-semibold prose-headings:text-foreground prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-sm prose-code:before:content-none prose-code:after:content-none max-h-[55dvh] overflow-y-auto">
                  <Markdown>
                    {summaryState.status === "success"
                      ? summaryState.result
                      : ""}
                  </Markdown>
                </div>
                <p className="text-muted-foreground text-xs">
                  {summaryState.status === "success" &&
                  summaryState.host === "local"
                    ? t("dialogs.summary.generatedLocally")
                    : t("dialogs.summary.generatedViaServer")}
                </p>
              </div>
            </Activity>
          </ViewTransition>
        </DialogContent>
      </Dialog>
    </div>
  );
}
