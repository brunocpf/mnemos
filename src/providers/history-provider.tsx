"use client";

import { useSearchParams } from "next/navigation";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePathname } from "@/i18n/navigation";

type HistoryState = {
  stack: string[];
  index: number;
};

type HistoryApi = HistoryState & {
  current: string | null;
  previous: string | null;
  canGoBack: boolean;
  pop: () => string | null;
  clear: () => void;
};

const HistoryContext = createContext<HistoryApi | null>(null);

function makeKey(
  pathname: string | null,
  searchParams: URLSearchParams | null,
) {
  if (!pathname) return null;
  const qs = searchParams?.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function HistoryProvider({
  children,
  maxSize = 50,
}: {
  children: React.ReactNode;
  maxSize?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const key = useMemo(
    () => makeKey(pathname, searchParams),
    [pathname, searchParams],
  );

  const [state, setState] = useState<HistoryState>({ stack: [], index: -1 });
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!key) return;
    if (lastRef.current === key) return;
    lastRef.current = key;

    (() => {
      setState((prev) => {
        const truncated = prev.stack.slice(0, prev.index + 1);
        const deduped =
          truncated[truncated.length - 1] === key
            ? truncated
            : [...truncated, key];

        const trimmed =
          deduped.length > maxSize
            ? deduped.slice(deduped.length - maxSize)
            : deduped;

        return { stack: trimmed, index: trimmed.length - 1 };
      });
    })();
  }, [key, maxSize]);

  const api = useMemo<HistoryApi>(() => {
    const { stack, index } = state;
    const current = index >= 0 ? stack[index] : null;
    const previous = index > 0 ? stack[index - 1] : null;

    return {
      ...state,
      current,
      previous,
      canGoBack: index > 0,
      pop: () => {
        let nextCurrent: string | null = null;
        setState((prev) => {
          const nextIndex = Math.max(0, prev.index - 1);
          nextCurrent = prev.stack[nextIndex] ?? null;
          return { ...prev, index: nextIndex };
        });
        return nextCurrent;
      },
      clear: () => {
        lastRef.current = null;
        setState({ stack: [], index: -1 });
      },
    };
  }, [state]);

  return (
    <HistoryContext.Provider value={api}>{children}</HistoryContext.Provider>
  );
}

export function useHistoryStack() {
  const ctx = useContext(HistoryContext);
  if (!ctx)
    throw new Error("useHistoryStack must be used within <HistoryProvider>");
  return ctx;
}
