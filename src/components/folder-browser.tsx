"use client";

import { IconFolderPlus, IconPencilPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";

import { Folder } from "@/client-data/folder";
import {
  createFolder,
  deleteFolder,
  moveFolder,
  renameFolder,
} from "@/client-data/folders-dal";
import { EmptyState } from "@/components/empty-state";
import { FolderDeleteDialog } from "@/components/folder-delete-dialog";
import { FolderNameDialog } from "@/components/folder-name-dialog";
import { FolderPickerDialog } from "@/components/folder-picker-dialog";
import { FolderTree } from "@/components/folder-tree";
import NotesList from "@/components/notes-list";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useFolders } from "@/hooks/use-folders";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { folderErrorKey } from "@/lib/folder-error-key";
import {
  buildFolderTree,
  getFolderAncestry,
  getFolderSubtreeIds,
} from "@/lib/folder-tree";

type DialogState =
  | { type: "create"; parentId: Folder["id"] | null }
  | { type: "rename"; folder: Folder }
  | { type: "move"; folder: Folder }
  | { type: "delete"; folder: Folder }
  | null;

/**
 * The id in the URL. The offline shell of `/folders/[folderId]` is a precached
 * page rendered for a placeholder id, so the real one is always read from the
 * pathname.
 */
function useRouteFolderId(isFolderRoute: boolean) {
  const pathname = usePathname();
  if (!isFolderRoute) return null;
  return pathname.match(/^\/folders\/([^/]+)/)?.[1] ?? null;
}

interface FolderBrowserProps {
  /** `false` on the home page (the root), `true` on `/folders/[folderId]`. */
  isFolderRoute?: boolean;
}

export function FolderBrowser({ isFolderRoute = false }: FolderBrowserProps) {
  const t = useTranslations("Folders");
  const tShared = useTranslations("Shared");
  const router = useRouter();
  const folders = useFolders();
  const activeFolderId = useRouteFolderId(isFolderRoute);
  const [dialog, setDialog] = useState<DialogState>(null);

  const tree = useMemo(() => buildFolderTree(folders ?? []), [folders]);
  const ancestry = useMemo(
    () => getFolderAncestry(folders ?? [], activeFolderId),
    [folders, activeFolderId],
  );
  const activeAncestorIds = useMemo(
    () => new Set(ancestry.map((folder) => folder.id)),
    [ancestry],
  );
  const activeFolder = ancestry.at(-1);

  const foldersLoaded = folders !== undefined;
  const notFound = isFolderRoute && foldersLoaded && !activeFolder;
  const showLoading = isFolderRoute && !foldersLoaded;

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      toast.error(t(`errors.${folderErrorKey(error)}`), {
        position: "top-center",
      });
    }
  };

  const handleCreate = (parentId: Folder["id"] | null, name: string) =>
    run(async () => {
      await createFolder({ name, parentId });
      toast.success(t("toasts.created", { name }), {
        position: "top-center",
      });
    });

  const handleRename = (folder: Folder, name: string) =>
    run(async () => {
      await renameFolder(folder.id, name);
      toast.success(t("toasts.renamed"), { position: "top-center" });
    });

  const handleMove = (folder: Folder, parentId: Folder["id"] | null) =>
    run(async () => {
      if (folder.parentId === parentId) return;
      await moveFolder(folder.id, parentId);
      toast.success(t("toasts.moved"), { position: "top-center" });
    });

  const handleDelete = (folder: Folder) => {
    setDialog(null);
    return run(async () => {
      const { destination } = await deleteFolder(folder.id);
      toast.success(t("toasts.deleted", { name: folder.name }), {
        position: "top-center",
      });
      // Leave the page of a folder that no longer exists.
      if (folder.id === activeFolderId) {
        router.replace(destination ? `/folders/${destination}` : "/");
      }
    });
  };

  const siblingNames = (parentId: Folder["id"] | null) =>
    (folders ?? [])
      .filter((folder) => folder.parentId === parentId)
      .map((folder) => folder.name);

  const deleting = dialog?.type === "delete" ? dialog.folder : null;
  const deletingParent = deleting?.parentId
    ? folders?.find((folder) => folder.id === deleting.parentId)
    : undefined;
  const pickerFolder = dialog?.type === "move" ? dialog.folder : null;

  const title = activeFolder?.name ?? tShared("navigation.yourNotes");

  if (notFound) {
    return (
      <EmptyState>
        <EmptyHeader>
          <EmptyTitle>{t("notFound.title")}</EmptyTitle>
          <EmptyDescription>{t("notFound.description")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" render={<Link href="/" />}>
            {t("notFound.home")}
          </Button>
        </EmptyContent>
      </EmptyState>
    );
  }

  if (showLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm">
        <Spinner />
        <span>{t("loading")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {activeFolder && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>
                {tShared("navigation.yourNotes")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {ancestry.map((folder, index) => (
              <Fragment key={folder.id}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {index === ancestry.length - 1 ? (
                    <BreadcrumbPage>{folder.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      render={<Link href={`/folders/${folder.id}`} />}
                    >
                      {folder.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <h1 className="mn-page-title-scroll text-2xl font-semibold select-none">
        {title}
      </h1>

      <section aria-labelledby="folders-heading" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="folders-heading"
            className="text-muted-foreground text-sm font-medium"
          >
            {t("tree.label")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() =>
              setDialog({ type: "create", parentId: activeFolderId })
            }
          >
            <IconFolderPlus />
            {activeFolder ? t("actions.newSubfolder") : t("actions.newFolder")}
          </Button>
        </div>
        {tree.length > 0 ? (
          <div className="bg-card/60 border-border/70 rounded-3xl border p-2 shadow-sm">
            <FolderTree
              nodes={tree}
              activeFolderId={activeFolderId}
              activeAncestorIds={activeAncestorIds}
              onCreateIn={(parentId) => setDialog({ type: "create", parentId })}
              onRename={(folder) => setDialog({ type: "rename", folder })}
              onMove={(folder) => setDialog({ type: "move", folder })}
              onDelete={(folder) => setDialog({ type: "delete", folder })}
            />
          </div>
        ) : (
          foldersLoaded && (
            <EmptyState className="p-6">
              <EmptyHeader>
                <EmptyTitle>{t("emptyState.noFolders.title")}</EmptyTitle>
                <EmptyDescription>
                  {t("emptyState.noFolders.description")}
                </EmptyDescription>
              </EmptyHeader>
            </EmptyState>
          )
        )}
      </section>

      <section aria-labelledby="notes-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="notes-heading"
            className="text-muted-foreground text-sm font-medium"
          >
            {t("notesHeading")}
          </h2>
          {activeFolder && (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() =>
                router.push(
                  `/note?new=${Date.now()}&folderId=${activeFolder.id}`,
                  { scroll: true },
                )
              }
            >
              <IconPencilPlus />
              {tShared("navigation.newNote")}
            </Button>
          )}
        </div>
        <NotesList folderId={activeFolder?.id ?? null} />
      </section>

      <FolderNameDialog
        mode="create"
        open={dialog?.type === "create"}
        onOpenChange={(open) => !open && setDialog(null)}
        siblingNames={siblingNames(
          dialog?.type === "create" ? dialog.parentId : null,
        )}
        onSubmit={(name) =>
          dialog?.type === "create" && handleCreate(dialog.parentId, name)
        }
      />
      <FolderNameDialog
        mode="rename"
        open={dialog?.type === "rename"}
        onOpenChange={(open) => !open && setDialog(null)}
        initialName={dialog?.type === "rename" ? dialog.folder.name : ""}
        siblingNames={siblingNames(
          dialog?.type === "rename" ? dialog.folder.parentId : null,
        )}
        onSubmit={(name) =>
          dialog?.type === "rename" && handleRename(dialog.folder, name)
        }
      />
      <FolderPickerDialog
        open={pickerFolder !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("dialogs.move.folderTitle")}
        description={t("dialogs.move.folderDescription")}
        currentFolderId={pickerFolder?.parentId ?? null}
        excludedFolderIds={
          pickerFolder
            ? getFolderSubtreeIds(folders ?? [], pickerFolder.id)
            : undefined
        }
        onSelect={(parentId) =>
          pickerFolder && handleMove(pickerFolder, parentId)
        }
      />
      <FolderDeleteDialog
        folder={deleting}
        destinationName={deletingParent?.name}
        subfolderCount={
          deleting
            ? (folders ?? []).filter((f) => f.parentId === deleting.id).length
            : 0
        }
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
