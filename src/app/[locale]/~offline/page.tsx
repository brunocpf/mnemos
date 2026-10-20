/* eslint-disable check-file/folder-naming-convention */
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { OfflineMessage } from "@/components/offline-message";
import { routing } from "@/i18n/routing";

import enMessages from "../../../../messages/en-US.json";
import ptMessages from "../../../../messages/pt-BR.json";

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

  const copy = {
    "en-US": enMessages.Offline,
    "pt-BR": ptMessages.Offline,
  };

  return <OfflineMessage copy={copy} fallbackLocale={locale} />;
}
