"use client";

import { IconWifiOff } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * Shown under the header while the device is offline. Notes and semantic
 * search run on-device, so only the cloud features are called out.
 */
export function OfflineIndicator() {
  const t = useTranslations("OfflineIndicator");
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--mn-header-h,0px)+0.5rem)] z-40 flex justify-center px-6"
    >
      <div className="bg-popover text-popover-foreground ring-foreground/10 flex max-w-md items-start gap-2 rounded-xl px-3 py-2 text-xs shadow-md ring-1">
        <IconWifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <strong className="font-semibold">{t("title")}</strong>{" "}
          <span className="text-muted-foreground">{t("description")}</span>
        </p>
      </div>
    </div>
  );
}
