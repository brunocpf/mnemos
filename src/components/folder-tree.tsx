"use client";

import {
  IconChevronRight,
  IconDots,
  IconEdit,
  IconFolder,
  IconFolderOpen,
  IconFolderPlus,
  IconFolderSymlink,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Folder } from "@/client-data/folder";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { FolderNode } from "@/lib/folder-tree";
import { cn } from "@/lib/utils";

export interface FolderActions {
  onCreateIn: (parentId: Folder["id"]) => void;
  onRename: (folder: Folder) => void;
  onMove: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
}

interface FolderTreeProps extends FolderActions {
  nodes: FolderNode[];
  activeFolderId: Folder["id"] | null;
  /** Ancestors of the active folder, which are expanded by default. */
  activeAncestorIds: ReadonlySet<Folder["id"]>;
}

export function FolderTree({
  nodes,
  activeFolderId,
  activeAncestorIds,
  ...actions
}: FolderTreeProps) {
  const t = useTranslations("Folders");
  // User toggles win over the default (ancestors of the active folder open).
  const [toggled, setToggled] = useState<ReadonlyMap<string, boolean>>(
    new Map(),
  );

  const isExpanded = (id: string) =>
    toggled.get(id) ?? activeAncestorIds.has(id);
  const toggle = (id: string) =>
    setToggled((prev) => new Map(prev).set(id, !isExpanded(id)));

  return (
    <nav aria-label={t("tree.label")}>
      <FolderBranch
        nodes={nodes}
        depth={0}
        activeFolderId={activeFolderId}
        isExpanded={isExpanded}
        toggle={toggle}
        {...actions}
      />
    </nav>
  );
}

interface FolderBranchProps extends FolderActions {
  nodes: FolderNode[];
  depth: number;
  activeFolderId: Folder["id"] | null;
  isExpanded: (id: string) => boolean;
  toggle: (id: string) => void;
}

function FolderBranch({
  nodes,
  depth,
  activeFolderId,
  isExpanded,
  toggle,
  ...actions
}: FolderBranchProps) {
  const t = useTranslations("Folders");

  return (
    <ul className="space-y-0.5">
      {nodes.map(({ folder, children }) => {
        const isActive = folder.id === activeFolderId;
        const hasChildren = children.length > 0;
        const expanded = hasChildren && isExpanded(folder.id);

        return (
          <li key={folder.id}>
            <div
              className={cn(
                "group/folder flex items-center gap-1 rounded-full pe-1 transition-colors",
                isActive ? "bg-muted font-medium" : "hover:bg-muted/50",
              )}
              style={{ paddingInlineStart: `${depth * 1}rem` }}
            >
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-expanded={expanded}
                  aria-label={
                    expanded
                      ? t("actions.collapse", { name: folder.name })
                      : t("actions.expand", { name: folder.name })
                  }
                  onClick={() => toggle(folder.id)}
                >
                  <IconChevronRight
                    className={cn(
                      "transition-transform rtl:rotate-180",
                      expanded && "rotate-90 rtl:rotate-90",
                    )}
                  />
                </Button>
              ) : (
                <span className="size-8 shrink-0" aria-hidden />
              )}
              <Link
                href={`/folders/${folder.id}`}
                aria-current={isActive ? "page" : undefined}
                className="focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-2 rounded-full py-1.5 text-sm outline-none focus-visible:ring-[3px]"
              >
                {isActive ? (
                  <IconFolderOpen className="size-4 shrink-0" />
                ) : (
                  <IconFolder className="size-4 shrink-0" />
                )}
                <span className="truncate">{folder.name}</span>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="cursor-pointer"
                      aria-label={t("actions.more", { name: folder.name })}
                    >
                      <IconDots />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={() => actions.onCreateIn(folder.id)}
                  >
                    <IconFolderPlus />
                    {t("actions.newSubfolder")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => actions.onRename(folder)}>
                    <IconEdit />
                    {t("actions.rename")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => actions.onMove(folder)}>
                    <IconFolderSymlink />
                    {t("actions.move")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => actions.onDelete(folder)}
                  >
                    <IconTrash />
                    {t("actions.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {expanded && (
              <FolderBranch
                nodes={children}
                depth={depth + 1}
                activeFolderId={activeFolderId}
                isExpanded={isExpanded}
                toggle={toggle}
                {...actions}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
