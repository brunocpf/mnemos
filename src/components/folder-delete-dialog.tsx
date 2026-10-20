"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useTranslations } from "next-intl";

import { db } from "@/client-data/db";
import { Folder } from "@/client-data/folder";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface FolderDeleteDialogProps {
  folder: Folder | null;
  /** Name of the folder the contents move into; omit for the top level. */
  destinationName?: string;
  subfolderCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (folder: Folder) => void;
}

export function FolderDeleteDialog({
  folder,
  destinationName,
  subfolderCount,
  onOpenChange,
  onConfirm,
}: FolderDeleteDialogProps) {
  const t = useTranslations("Folders");
  // Trashed notes keep their folder until they're purged, so count them out of
  // the message but they are moved along with the rest.
  const noteCount = useLiveQuery(
    () =>
      folder
        ? db.notes
            .where("folderId")
            .equals(folder.id)
            .filter((note) => !note.deleted)
            .count()
        : 0,
    [folder?.id],
    0,
  );

  return (
    <AlertDialog open={folder !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("dialogs.delete.title", { name: folder?.name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("dialogs.delete.description", {
              notes: noteCount,
              folders: subfolderCount,
              destination: destinationName ?? t("dialogs.delete.topLevel"),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("dialogs.delete.cancel")}</AlertDialogCancel>
          <Button
            variant="destructive"
            className="cursor-pointer"
            onClick={() => folder && onConfirm(folder)}
          >
            {t("dialogs.delete.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
