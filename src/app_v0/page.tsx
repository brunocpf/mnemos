"use client";

import { useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useState } from "react";

import { NoteList } from "@/components/note-list";
import { useDebounce } from "@/hooks/use-debounce";
import { useSemanticSearch } from "@/hooks/use-semantic-search";

export default function Home() {
  const searchParams = useSearchParams();
  const paramQuery = searchParams.get("search") ?? "";
  const [searchQuery, setSearchQuery] = useState(paramQuery);

  useEffect(() => {
    setSearchQuery(paramQuery);
  }, [paramQuery]);

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
    </div>
  );
}
