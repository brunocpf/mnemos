"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

type UseLocalStorageOptions<T> = {
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
};

type LocalStorageSetter<T> = (next: T | ((prev: T) => T)) => void;

const LOCAL_STORAGE_EVENT = "mnemos:local-storage";

function isBrowser() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function defaultSerialize<T>(value: T): string {
  return JSON.stringify(value);
}

function defaultDeserialize<T>(value: string): T {
  return JSON.parse(value) as T;
}

function dispatchLocalStorageEvent(key: string) {
  if (!isBrowser()) return;
  window.dispatchEvent(
    new CustomEvent(LOCAL_STORAGE_EVENT, { detail: { key } }),
  );
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>,
): readonly [T, LocalStorageSetter<T>, () => void] {
  const serialize = options?.serialize ?? defaultSerialize<T>;
  const deserialize = options?.deserialize ?? defaultDeserialize<T>;

  const snapshotCacheRef = useRef<
    | {
        key: string;
        raw: string | null;
        value: T;
        initialValue: T;
        deserialize: (value: string) => T;
      }
    | undefined
  >(undefined);

  const getSnapshot = useCallback((): T => {
    if (!isBrowser()) {
      return initialValue;
    }

    const raw = window.localStorage.getItem(key);

    const cached = snapshotCacheRef.current;
    if (
      cached &&
      cached.key === key &&
      cached.raw === raw &&
      cached.deserialize === deserialize &&
      (raw !== null || cached.initialValue === initialValue)
    ) {
      return cached.value;
    }

    if (raw === null) {
      snapshotCacheRef.current = {
        key,
        raw,
        value: initialValue,
        initialValue,
        deserialize,
      };
      return initialValue;
    }

    try {
      const parsed = deserialize(raw);
      snapshotCacheRef.current = {
        key,
        raw,
        value: parsed,
        initialValue,
        deserialize,
      };
      return parsed;
    } catch {
      snapshotCacheRef.current = {
        key,
        raw,
        value: initialValue,
        initialValue,
        deserialize,
      };
      return initialValue;
    }
  }, [deserialize, initialValue, key]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!isBrowser()) {
        return () => {};
      }

      const onStorage = (event: StorageEvent) => {
        if (event.storageArea !== window.localStorage) return;
        if (event.key !== key) return;
        onStoreChange();
      };

      const onCustom = (event: Event) => {
        const customEvent = event as CustomEvent<{ key?: string } | undefined>;
        if (customEvent.detail?.key !== key) return;
        onStoreChange();
      };

      window.addEventListener("storage", onStorage);
      window.addEventListener(LOCAL_STORAGE_EVENT, onCustom);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(LOCAL_STORAGE_EVENT, onCustom);
      };
    },
    [key],
  );

  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => initialValue,
  );

  const setValue: LocalStorageSetter<T> = useCallback(
    (next) => {
      if (!isBrowser()) return;

      const current = getSnapshot();
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(current) : next;

      try {
        window.localStorage.setItem(key, serialize(resolved));
      } catch {
        return;
      }

      dispatchLocalStorageEvent(key);
    },
    [getSnapshot, key, serialize],
  );

  const removeValue = useCallback(() => {
    if (!isBrowser()) return;

    try {
      window.localStorage.removeItem(key);
    } catch {
      return;
    }

    dispatchLocalStorageEvent(key);
  }, [key]);

  return useMemo(
    () => [value, setValue, removeValue] as const,
    [removeValue, setValue, value],
  );
}
