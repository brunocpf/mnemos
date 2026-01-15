"use client";

import { IconPencil } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Activity, ViewTransition } from "react";

import { AppFooterSlot } from "@/components/app-footer-slot";
import { EmptyState } from "@/components/empty-state";
import SearchInput from "@/components/search-input";
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
import { useRouter } from "@/i18n/navigation";
import { useSearchValue } from "@/providers/search-value-provider";

import { NotesListItem } from "./notes-list-item";

export default function NotesList() {
  const t = useTranslations("Notes");
  const { searchValue } = useSearchValue();
  const debouncedSearchValue = useDebounce(searchValue, 150);
  const { data: notes, isLoading, error } = useNotes(debouncedSearchValue);
  const router = useRouter();

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

  return (
    <div>
      <ViewTransition>
        <Activity mode={state === "loading" ? "visible" : "hidden"}>
          <EmptyState className="opacity-100 transition-opacity delay-500 starting:opacity-0">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Spinner />
              <span>
                {Boolean(searchValue)
                  ? t("loading.search")
                  : t("loading.notes")}
              </span>
            </div>
          </EmptyState>
        </Activity>
        <Activity mode={state === "error" ? "visible" : "hidden"}>
          <EmptyState>
            <div>{`${t("errors.loadingNotes")}: ${error?.message}`}</div>
          </EmptyState>
        </Activity>
        <Activity mode={state === "filtered-empty" ? "visible" : "hidden"}>
          <EmptyState>
            <div>{`No notes found for "${debouncedSearchValue}".`}</div>
          </EmptyState>
        </Activity>
        <Activity mode={state === "empty" ? "visible" : "hidden"}>
          <EmptyState>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconPencil />
              </EmptyMedia>
              <EmptyTitle>{t("emptyState.title")}</EmptyTitle>
              <EmptyDescription>{t("emptyState.description")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                onClick={() => {
                  router.push("/note", { scroll: true });
                }}
              >
                {t("emptyState.actions.createFirstNote")}
              </Button>
            </EmptyContent>
          </EmptyState>
        </Activity>
        <Activity mode={state === "list" ? "visible" : "hidden"}>
          <ul className="space-y-3">
            {safeNotes.map((noteEntry, index) => (
              <li
                className="[content-visibility:auto]"
                key={noteEntry.note.id}
                style={{
                  transitionDelay: `${index * 50}ms`,
                }}
              >
                <NotesListItem note={noteEntry.note} match={noteEntry.match} />
              </li>
            ))}
          </ul>
        </Activity>
      </ViewTransition>
      <AppFooterSlot>
        <SearchInput />
      </AppFooterSlot>
    </div>
  );
}
