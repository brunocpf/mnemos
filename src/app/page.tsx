"use client";

import { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from "react";

import { ActionFooter } from "@/components/action-footer";
import { NoteList } from "@/components/note-list";
import { useDebounce } from "@/hooks/use-debounce";
import { useSemanticSearch } from "@/hooks/use-semantic-search";

export default function Home() {
  const searchParams = useSearchParams();
  const pathname = usePathname() as Route;
  const router = useRouter();

  const paramQuery = searchParams.get("search") ?? "";
  const serializedSearchParams = searchParams.toString();

  const [searchQuery, setSearchQuery] = useState(paramQuery);

  useEffect(() => {
    setSearchQuery(paramQuery);
  }, [paramQuery]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);

      if (value === paramQuery) return;

      startTransition(() => {
        const params = new URLSearchParams(serializedSearchParams);
        if (value.trim()) {
          params.set("search", value);
        } else {
          params.delete("search");
        }

        const next = params.toString();
        router.replace(next ? `${pathname}?${next}` : pathname, {
          scroll: false,
        });
      });
    },
    [paramQuery, pathname, router, serializedSearchParams],
  );

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const debouncedSearchQuery = useDebounce(deferredSearchQuery, 300);

  const { matches, isSearching, error } =
    useSemanticSearch(debouncedSearchQuery);

  return (
    <div className="relative pb-32">
      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16">
        <section className="space-y-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.4em] uppercase">
            Your Notes
          </p>
          <NoteList
            searchQuery={debouncedSearchQuery}
            matches={matches}
            isSearching={isSearching}
            error={error}
          />
        </section>
      </main>

      <ActionFooter
        placeholder="Search notes..."
        buttonLabel="New Note"
        buttonHref="/note"
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        isSearching={isSearching}
      />
    </div>
  );
}
