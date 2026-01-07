"use client";

import { IconPencil } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useDebounce } from "@/hooks/use-debounce";
import { useNotes } from "@/hooks/use-notes";
import { cn } from "@/lib/utils";
import { useSearchValue } from "@/providers/search-value-provider";

export default function NotesList() {
  const t = useTranslations("Notes");
  const { searchValue } = useSearchValue();
  const debouncedSearchValue = useDebounce(searchValue, 150);
  const { data: notes, isLoading, error } = useNotes(debouncedSearchValue);

  const safeNotes = notes ?? [];

  const noNotes = safeNotes.length === 0;
  const filteredNoResults = Boolean(searchValue) && noNotes;

  const state: "loading" | "error" | "filtered-empty" | "empty" | "list" =
    isLoading || !notes
      ? "loading"
      : error
        ? "error"
        : filteredNoResults
          ? "filtered-empty"
          : noNotes
            ? "empty"
            : "list";

  const paneBaseClassName =
    "col-start-1 row-start-1 transition-opacity duration-300 starting:opacity-0 opacity-100 pointer-events-auto data-[active=false]:opacity-0 data-[active=false]:pointer-events-none";

  return (
    <div className="relative grid">
      <div
        className={cn(
          paneBaseClassName,
          "delay-300 data-[active=false]:delay-0",
        )}
        data-active={state === "loading"}
      >
        <EmptyState>
          <div className="flex items-center justify-center gap-2">
            <Spinner />
            <span>{t("Loading your notes")}</span>
          </div>
        </EmptyState>
      </div>

      <div className={paneBaseClassName} data-active={state === "error"}>
        <EmptyState>
          <div>Error loading notes: {error?.message}</div>
        </EmptyState>
      </div>

      <div
        className={paneBaseClassName}
        data-active={state === "filtered-empty"}
      >
        <EmptyState>
          <div>{`No notes found for "${debouncedSearchValue}".`}</div>
        </EmptyState>
      </div>

      <div className={paneBaseClassName} data-active={state === "empty"}>
        <EmptyState>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconPencil />
            </EmptyMedia>
            <EmptyTitle>{t("No Notes")}</EmptyTitle>
            <EmptyDescription>
              {t("Start writing notes to see them here")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm">
              {t("Create your first note")}
            </Button>
          </EmptyContent>
        </EmptyState>
      </div>

      <div className={paneBaseClassName} data-active={state === "list"}>
        <ul className="space-y-3">
          {safeNotes.map((note) => (
            <li key={note.id}>{note.content}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
