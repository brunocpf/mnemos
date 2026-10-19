/* eslint-disable check-file/folder-naming-convention */
import { IconWifiOff } from "@tabler/icons-react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { OfflineRetryButton } from "@/components/offline-retry-button";
import { routing } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Offline");
  return { title: t("title"), robots: { index: false } };
}

export default async function OfflinePage({
  params,
}: PageProps<"/[locale]/~offline">) {
  // The shared layout reads search params, so this can't be prerendered.
  await connection();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations("Offline");

  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <IconWifiOff className="text-muted-foreground size-10" aria-hidden />
      <h1 className="text-2xl font-semibold">{t("heading")}</h1>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      <p className="text-muted-foreground text-sm">{t("hint")}</p>
      <OfflineRetryButton label={t("retry")} />
    </main>
  );
}
