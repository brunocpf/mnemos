"use client";

import {
  IconChevronCompactRight,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import markdownToTxt from "markdown-to-txt";
import Link from "next/link";
import { Activity, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Note, noteSchema } from "@/client-data/note";
import {
  deleteNote,
  permanentlyDeleteNote,
  restoreNote,
  updateNoteTitle,
} from "@/client-data/notes-dal";
import { HighlightedSnippet } from "@/components/highlighted-snippet";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { SemanticMatch } from "@/hooks/use-semantic-search";
import { defaultFormatter } from "@/lib/dateFormatters";
import { encodeSearchHighlight } from "@/lib/search-highlight";
import { useEmbedder } from "@/providers/embedder-provider";

interface NoteListItemProps {
  note: Note;
  match?: SemanticMatch;
}

const formSchema = z.object({
  newTitle: noteSchema.shape.title.nonoptional(),
});

export function NoteListItem({ note, match }: NoteListItemProps) {
  const embedder = useEmbedder();

  const handleDelete = () => {
    deleteNote(note.id);
    toast.info("Note deleted", {
      position: "top-center",
      action: {
        label: "Undo",
        onClick: () => {
          restoreNote(note.id);
          toast.info("Note restored", {
            position: "top-center",
          });
        },
      },
      onAutoClose: () => {
        permanentlyDeleteNote(note.id);
      },
    });

    // TODO: Figure out a way to clean up soft deleted notes if the autoclose trigger is not fired
  };

  const content = useMemo(() => markdownToTxt(note.content), [note.content]);
  const title = useMemo(() => {
    if (note.title && note.title.trim().length > 0) {
      return note.title;
    }
    const firstLine = content.split("\n")[0].trim().slice(0, 100);

    return firstLine.length > 0 ? firstLine : "Untitled";
  }, [note.title, content]);

  const highlightParam = useMemo(() => {
    if (!match) return undefined;

    return encodeSearchHighlight({
      noteId: match.noteId,
      chunkId: match.chunkId,
      snippet: match.snippet,
      highlights: match.highlights,
      leadingEllipsis: match.leadingEllipsis,
      trailingEllipsis: match.trailingEllipsis,
      terms: match.terms,
    });
  }, [match]);

  const form = useForm({
    defaultValues: {
      newTitle: title ?? "",
    },
    validators: {
      onChange: formSchema,
    },
    onSubmit: async ({ value: { newTitle } }) => {
      const updatedTitle = newTitle.trim();

      await updateNoteTitle(note.id, updatedTitle);
      embedder.flush({
        id: note.id,
        title: updatedTitle,
        content: note.content,
      });
      toast.success("Note renamed", { position: "top-center" });
    },
  });

  return (
    <Dialog>
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <Button
              nativeButton={false}
              variant="card"
              className="flex h-auto w-full cursor-pointer items-center justify-between px-8 text-start"
              render={
                <Link
                  href={{
                    pathname: "/note",
                    query: highlightParam
                      ? { noteId: note.id, highlight: highlightParam }
                      : { noteId: note.id },
                  }}
                />
              }
            >
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-semibold">
                    {title}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Updated {defaultFormatter.format(new Date(note.updatedAt))}
                  </p>
                </div>
                <Activity mode={match || note.content ? "visible" : "hidden"}>
                  {match ? (
                    <HighlightedSnippet
                      className="text-muted-foreground mt-3 block truncate"
                      text={match.snippet || content}
                      highlights={match.highlights}
                      leadingEllipsis={match.leadingEllipsis}
                      trailingEllipsis={match.trailingEllipsis}
                    />
                  ) : (
                    <p className="text-muted-foreground mt-3 min-w-0 truncate text-sm">
                      {content}
                    </p>
                  )}
                </Activity>
              </div>
              <IconChevronCompactRight
                data-icon="inline-end"
                className="size-10"
              />
            </Button>
          }
        />
        <ContextMenuContent className="w-52">
          <DialogTrigger
            nativeButton={false}
            render={
              <ContextMenuItem nativeButton={false} inset>
                <IconEdit />
                Rename
              </ContextMenuItem>
            }
          />
          <ContextMenuItem
            nativeButton={false}
            inset
            variant="destructive"
            onClick={handleDelete}
          >
            <IconTrash />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <DialogContent>
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            form.handleSubmit(e);
          }}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>Rename this note.</DialogDescription>
          </DialogHeader>
          <form.Field name="newTitle">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <Input
                    className="mt-2"
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Note title"
                    autoComplete="off"
                    autoFocus
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
          <DialogFooter>
            <DialogClose
              render={
                <Button className="cursor-pointer" type="submit">
                  Confirm
                </Button>
              }
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
