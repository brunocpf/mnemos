"use client";

import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createNoteFromShare } from "@/client-data/share-note";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Link, useRouter } from "@/i18n/navigation";

/**
 * Landing page of the manifest `share_target`. Creates a note from the shared
 * title/text/url, then replaces itself with the note so a reload or back
 * navigation can't share the same payload twice.
 */
export function ShareHandler() {
  const t = useTranslations("Share");
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledRef = useRef(false);
  const [failed, setFailed] = useState(false);

  const title = searchParams.get("title");
  const text = searchParams.get("text");
  const url = searchParams.get("url");

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    createNoteFromShare({ title, text, url })
      .then((noteId) => {
        if (!noteId) {
          toast.info(t("toasts.nothingShared"), { position: "top-center" });
          router.replace(`/note?new=${Date.now()}`);
          return;
        }
        toast.success(t("toasts.saved"), { position: "top-center" });
        router.replace(`/note?noteId=${noteId}`);
      })
      .catch((error: unknown) => {
        console.error("Failed to save shared content", error);
        setFailed(true);
      });
  }, [title, text, url, router, t]);

  if (failed) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-6 pt-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <IconAlertTriangle aria-hidden />
          {t("error.title")}
        </h1>
        <p className="text-muted-foreground">{t("error.description")}</p>
        <Button render={<Link href="/" />}>{t("error.home")}</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl items-center gap-2 px-6 pt-8">
      <Spinner />
      <span>{t("saving")}</span>
    </main>
  );
}
