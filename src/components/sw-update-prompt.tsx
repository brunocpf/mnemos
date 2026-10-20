"use client";

import { useSerwist } from "@serwist/turbopack/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * The service worker does not skip waiting on its own, so an open tab keeps
 * running the version it loaded. When a new version is waiting, offer a
 * reload instead of swapping assets underneath the user.
 */
export function SwUpdatePrompt() {
  const t = useTranslations("PwaUpdate");
  const { serwist } = useSerwist();

  useEffect(() => {
    if (!serwist) return;

    const onWaiting = () => {
      toast.info(t("title"), {
        id: "sw-update",
        description: t("description"),
        duration: Infinity,
        position: "bottom-center",
        action: {
          label: t("reload"),
          onClick: () => {
            serwist.addEventListener("controlling", () =>
              window.location.reload(),
            );
            serwist.messageSkipWaiting();
          },
        },
      });
    };

    serwist.addEventListener("waiting", onWaiting);
    return () => serwist.removeEventListener("waiting", onWaiting);
  }, [serwist, t]);

  return null;
}
