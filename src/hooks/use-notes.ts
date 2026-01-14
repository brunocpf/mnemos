import { useLiveQuery } from "dexie-react-hooks";
import { startTransition, useEffect, useState } from "react";

import { db } from "@/client-data/db";
import { Note } from "@/client-data/note";

const loadingSymbol = Symbol("loading");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useNotes(search: string): {
  data?: Note[];
  isLoading: boolean;
  error: Error | null;
} {
  const [isLoading, setIsLoading] = useState(true);
  const allNotes = useLiveQuery(
    () => db.notes.where("deleted").equals(0).reverse().sortBy("updatedAt"),
    [],
    loadingSymbol,
  );

  useEffect(() => {
    const dbIsLoading = allNotes === loadingSymbol;

    if (isLoading !== dbIsLoading) {
      startTransition(() => {
        setIsLoading(dbIsLoading);
      });
    }
  }, [allNotes, isLoading]);

  return {
    data: allNotes === loadingSymbol ? undefined : allNotes,
    isLoading,
    error: null,
  };
}
