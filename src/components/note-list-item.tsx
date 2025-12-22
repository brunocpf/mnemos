"use client";
import {
  IconChevronCompactRight,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
import markdownToTxt from "markdown-to-txt";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, useMemo } from "react";
import { toast } from "sonner";

import { Note } from "@/client-data/note";
import { deleteNote, restoreNote } from "@/client-data/notes-dal";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { defaultFormatter } from "@/lib/dateFormatters";

interface NoteListItemProps {
  note: Note;
}

export function NoteListItem({ note }: NoteListItemProps) {
  const { push } = useRouter();

  const handleEdit = () => {
    push(`/note?noteId=${note.id}`);
  };

  const handleDelete = () => {
    deleteNote(note.id);
    toast("Note deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          restoreNote(note.id);
          toast("Note restored");
        },
      },
    });
  };

  const content = useMemo(() => markdownToTxt(note.content), [note.content]);
  const title = useMemo(() => {
    if (note.title && note.title.trim().length > 0) {
      return note.title;
    }
    const firstLine = content.split("\n")[0].trim();
    return firstLine.slice(0, 100);
  }, [note.title, content]);

  return (
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
                  query: { noteId: note.id },
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
              <Activity mode={note.content ? "visible" : "hidden"}>
                <p className="text-muted-foreground mt-3 min-w-0 truncate text-sm">
                  {content}
                </p>
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
        <ContextMenuItem inset onClick={handleEdit}>
          <IconEdit />
          Rename
        </ContextMenuItem>
        <ContextMenuItem inset variant="destructive" onClick={handleDelete}>
          <IconTrash />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
