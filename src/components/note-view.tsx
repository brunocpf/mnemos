"use client";

import { IconSparkles2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
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
import { z } from "zod";

import { db } from "@/client-data/db";
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
import {
  decodeSearchHighlight,
  SearchHighlightPayload,
} from "@/lib/search-highlight";
import {
  getDownloadProgress,
  getSummaryFailureReason,
  SummaryFailureReason,
} from "@/lib/summary-failure";
import { useEmbedder } from "@/providers/embedder-provider";
import { useSettings } from "@/providers/settings-provider";
import { useSummarizer } from "@/providers/summarizer-provider";

/**
 * Reads the note from the URL. The offline shell of `/note` is a precached page
 * rendered without query params, so `noteId`, `folderId`, `new` and
 * `highlight` come from the client-side search params, never from the server.
 */
export function NoteView() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get("noteId") || undefined;
  const folderId = z.uuid().safeParse(searchParams.get("folderId")).data;
  const forceNew = searchParams.get("new");
  const highlightParam = searchParams.get("highlight");
  const highlight = useMemo(() => {
    if (!highlightParam) return undefined;
    try {
      return decodeSearchHighlight(highlightParam);
    } catch {
      return undefined;
    }
  }, [highlightParam]);

  return (
    <NoteViewContent
      key={`${noteId ?? ""}:${forceNew ?? ""}`}
      noteId={noteId}
      folderId={folderId}
      highlight={highlight}
    />
  );
}

interface NoteViewContentProps {
  noteId?: string;
  /** Folder a newly created note is filed in; the root when omitted. */
  folderId?: string;
  highlight?: SearchHighlightPayload;
}

function NoteViewContent({
  noteId,
  folderId,
  highlight,
}: NoteViewContentProps) {
  const t = useTranslations("NoteView");
  const {
    summarize,
    isReady: summarizerIsReady,
    modelDownloadState: summarizerDownloadState,
    retry: retrySummarizer,
  } = useSummarizer();
  const { settings } = useSettings();
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
    | { status: "error"; reason: SummaryFailureReason }
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

  const getFailureReason = () =>
    getSummaryFailureReason({
      host: settings.summarizerHost,
      modelDownloadState: summarizerDownloadState,
      online: navigator.onLine,
    });

  const progress = getDownloadProgress(summarizerDownloadState);
  const progressText =
    progress === undefined ? "" : t("dialogs.summary.progress", { progress });

  const handleRetry = () => {
    if (
      summaryState.status === "error" &&
      summaryState.reason.kind === "modelFailed"
    ) {
      retrySummarizer();
      setSummaryState({ status: "idle" });
      return;
    }
    void handleSummarize();
  };

  const handleSummarize = async () => {
    if (!noteData || !canSummarize) return;

    setIsSummaryDialogOpen(true);
    setBecameReadyWhileDialogOpen(false);

    if (!summarizerIsReady) {
      const reason = getFailureReason();
      setSummaryState(
        reason.kind === "modelFailed"
          ? { status: "error", reason }
          : { status: "idle" },
      );
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
        setSummaryState({ status: "error", reason: getFailureReason() });
      }
    } catch (error: unknown) {
      console.error("Summarization failed", error);
      setSummaryState({ status: "error", reason: getFailureReason() });
    }
  };

  const handlePersist = async (
    noteIdToPersist: string | undefined,
    value: string,
  ) => {
    if (!noteIdToPersist && value.trim() !== "") {
      // The folder may have been deleted since the editor was opened.
      const folderExists = folderId
        ? Boolean(await db.folders.get(folderId))
        : false;
      noteIdToPersist = await createNote({
        content: value,
        folderId: folderExists ? folderId : null,
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

  const handleBlur = (blurNoteId: string | undefined, content: string) => {
    const id = blurNoteId ?? currentNoteId;
    if (id && embedderIsReady && content.trim() !== "") {
      flush({ id, content });
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
          <Button
            disabled={!canSummarize}
            onClick={handleSummarize}
            title={
              canSummarize && !summarizerIsReady
                ? `${t("dialogs.summary.unavailable")} ${progressText}`.trim()
                : undefined
            }
          >
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
              <Activity
                mode={
                  !summarizerIsReady && summaryState.status !== "error"
                    ? "visible"
                    : "hidden"
                }
              >
                <DialogDescription>
                  {t("dialogs.summary.unavailable")}
                  {progressText ? ` ${progressText}` : ""}{" "}
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
                <DialogDescription className="flex flex-col items-start gap-3">
                  {summaryState.status === "error" ? (
                    <>
                      <span>
                        {t(
                          `dialogs.summary.errors.${summaryState.reason.kind}`,
                          {
                            progress:
                              summaryState.reason.kind === "downloading" &&
                              summaryState.reason.progress !== undefined
                                ? summaryState.reason.progress
                                : "…",
                          },
                        )}
                      </span>
                      <span className="flex items-center gap-3">
                        <Button size="sm" onClick={handleRetry}>
                          {t("dialogs.summary.retry")}
                        </Button>
                        <Link href="/settings" className="text-sm underline">
                          {t("dialogs.summary.openSettings")}
                        </Link>
                      </span>
                    </>
                  ) : null}
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
