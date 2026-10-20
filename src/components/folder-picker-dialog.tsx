"use client";

import { IconFolder, IconHome } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Folder } from "@/client-data/folder";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useFolders } from "@/hooks/use-folders";
import { buildFolderTree, FolderNode } from "@/lib/folder-tree";

interface FolderPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** The folder the item is in right now (`null` = top level); marked as current. */
  currentFolderId: Folder["id"] | null;
  /** Folders that can't be chosen, e.g. a folder and its subtree when moving it. */
  excludedFolderIds?: ReadonlySet<Folder["id"]>;
  onSelect: (folderId: Folder["id"] | null) => void;
}

type Option = { folder: Folder; depth: number; path: string };

function flatten(
  nodes: FolderNode[],
  excluded: ReadonlySet<string>,
  depth = 0,
  parentPath = "",
): Option[] {
  return nodes.flatMap(({ folder, children }) => {
    if (excluded.has(folder.id)) return [];
    const path = parentPath ? `${parentPath} / ${folder.name}` : folder.name;
    return [
      { folder, depth, path },
      ...flatten(children, excluded, depth + 1, path),
    ];
  });
}

export function FolderPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  currentFolderId,
  excludedFolderIds,
  onSelect,
}: FolderPickerDialogProps) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <Command>
        <FolderPickerBody
          currentFolderId={currentFolderId}
          excludedFolderIds={excludedFolderIds}
          onSelect={(folderId) => {
            onOpenChange(false);
            onSelect(folderId);
          }}
        />
      </Command>
    </CommandDialog>
  );
}

// Mounted only while the dialog is open, so lists with many notes don't each
// keep a live folders query running.
function FolderPickerBody({
  currentFolderId,
  excludedFolderIds,
  onSelect,
}: Pick<
  FolderPickerDialogProps,
  "currentFolderId" | "excludedFolderIds" | "onSelect"
>) {
  const t = useTranslations("Folders");
  const folders = useFolders();

  const options = useMemo(
    () =>
      flatten(buildFolderTree(folders ?? []), excludedFolderIds ?? new Set()),
    [folders, excludedFolderIds],
  );

  return (
    <>
      <CommandInput placeholder={t("dialogs.move.search")} autoFocus />
      <CommandList>
        <CommandEmpty>{t("dialogs.move.empty")}</CommandEmpty>
        <CommandItem
          value={t("dialogs.move.topLevel")}
          data-checked={currentFolderId === null}
          onSelect={() => onSelect(null)}
        >
          <IconHome />
          {t("dialogs.move.topLevel")}
        </CommandItem>
        {options.map(({ folder, depth, path }) => (
          <CommandItem
            key={folder.id}
            value={`${path} ${folder.id}`}
            data-checked={currentFolderId === folder.id}
            onSelect={() => onSelect(folder.id)}
            style={{ paddingInlineStart: `${0.75 + depth}rem` }}
          >
            <IconFolder />
            <span className="truncate">{folder.name}</span>
          </CommandItem>
        ))}
      </CommandList>
    </>
  );
}
