"use client";

import { IconWifiOff } from "@tabler/icons-react";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const subscribeNoop = () => () => {};

type Copy = {
  heading: string;
  description: string;
  hint: string;
  retry: string;
};

/**
 * The offline document is precached once and shared by every locale, so the
 * language is chosen from the browser rather than from the URL.
 */
export function OfflineMessage({
  copy,
  fallbackLocale,
}: {
  copy: Record<string, Copy>;
  fallbackLocale: string;
}) {
  const preferred = useSyncExternalStore(
    subscribeNoop,
    () => navigator.languages?.[0] ?? navigator.language ?? "",
    () => "",
  );
  const locale =
    Object.keys(copy).find(
      (l) => l.toLowerCase() === preferred.toLowerCase(),
    ) ??
    Object.keys(copy).find(
      (l) => l.split("-")[0] === preferred.split("-")[0].toLowerCase(),
    ) ??
    fallbackLocale;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = copy[locale] ?? copy[fallbackLocale];

  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <IconWifiOff className="text-muted-foreground size-10" aria-hidden />
      <h1 className="text-2xl font-semibold">{t.heading}</h1>
      <p className="text-muted-foreground text-sm">{t.description}</p>
      <p className="text-muted-foreground text-sm">{t.hint}</p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        {t.retry}
      </Button>
    </main>
  );
}
