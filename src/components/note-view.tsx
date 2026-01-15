"use client";

import { IconSparkles2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Activity, useEffect, useRef, useState, ViewTransition } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";

import { createNote, updateNote } from "@/client-data/notes-dal";
import { NoteEditorForm } from "@/components/note-editor-form";
import { Spinner } from "@/components/ui/spinner";
import { useNoteById } from "@/hooks/use-note-by-id";
import { Link } from "@/i18n/navigation";
import { useEmbedder } from "@/providers/embedder-provider";
import { useSummarizer } from "@/providers/summarizer-provider";

import { AppHeaderContentSlot } from "./app-header-content-slot";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export interface NoteViewProps {
  noteId?: string;
}

export function NoteView({ noteId }: NoteViewProps) {
  const t = useTranslations("NoteView");
  const { summarize, isReady } = useSummarizer();
  const { schedule, flush } = useEmbedder();
  const [currentNoteId, setCurrentNoteId] = useState(() => noteId);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [becameReadyWhileDialogOpen, setBecameReadyWhileDialogOpen] =
    useState(false);
  const lastIsReadyRef = useRef(isReady);
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

  const canSummarize = !!noteData?.content?.trim();

  useEffect(() => {
    if (!isSummaryDialogOpen) return;

    const wasReady = lastIsReadyRef.current;
    if (!wasReady && isReady && summaryState.status === "idle") {
      setTimeout(() => {
        setBecameReadyWhileDialogOpen(true);
      }, 0);
    }

    lastIsReadyRef.current = isReady;
  }, [isReady, isSummaryDialogOpen, summaryState.status]);

  const handleSummaryDialogOpenChange = (open: boolean) => {
    setIsSummaryDialogOpen(open);

    if (!open) {
      setBecameReadyWhileDialogOpen(false);
    }

    lastIsReadyRef.current = isReady;
  };

  const handleSummarize = async () => {
    if (!noteData || !canSummarize) return;

    setIsSummaryDialogOpen(true);
    setBecameReadyWhileDialogOpen(false);

    if (!isReady) {
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
        setSummaryState({
          status: "error",
          error: response.error ?? t("dialogs.summary.errorFallback"),
        });
      }
    } catch (error: unknown) {
      setSummaryState({
        status: "error",
        error: error instanceof Error ? error.message : String(error),
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

    if (noteIdToPersist) {
      schedule({ id: noteIdToPersist, content: value });
    }
  };

  const handleBlur = () => {
    if (currentNoteId) {
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
          <NoteEditorForm
            key={noteId ? (noteData?.id ?? "unloaded-note") : "new-note"}
            noteId={currentNoteId}
            initialContent={noteData?.content ?? ""}
            onChange={handlePersist}
            onBlur={handleBlur}
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
              <Activity mode={!isReady ? "visible" : "hidden"}>
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
                isReady && summaryState.status === "success"
                  ? "visible"
                  : "hidden"
              }
            >
              <div className="grid gap-3">
                <div className="prose dark:prose-invert prose-headings:mt-8 prose-headings:font-semibold prose-headings:text-black prose-h1:text-5xl prose-h2:text-4xl prose-h3:text-3xl prose-h4:text-2xl prose-h5:text-xl prose-h6:text-lg dark:prose-headings:text-white">
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
