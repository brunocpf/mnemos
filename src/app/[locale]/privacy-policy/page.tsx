import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ViewTransition } from "react";

type DataPoint = {
  title: string;
  description: string;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PrivacyPolicy");

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("PrivacyPolicy");
  const locale = await getLocale();

  const lastUpdatedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date("2025-12-25"));

  const localDataPoints = t.raw("localDataPoints") as DataPoint[];
  const aiDisclosures = t.raw("aiDisclosures") as DataPoint[];
  const userControls = t.raw("userControls") as DataPoint[];

  return (
    <ViewTransition
      enter={{
        "navigation-back": "slide-in-back",
        "navigation-forward": "slide-in-forward",
        default: "slide-in-forward",
      }}
      exit={{
        "navigation-back": "slide-in-back",
        "navigation-forward": "slide-in-forward",
        default: "slide-in-forward",
      }}
    >
      <main className="mx-auto flex max-w-5xl snap-start scroll-pt-(--mn-header-h) flex-col gap-2 px-6 pb-16">
        <header className="space-y-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.4em] uppercase">
            {t("kicker")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-foreground text-3xl font-semibold tracking-tight">
              {t("heroTitle")}
            </h1>
          </div>
          <p className="text-muted-foreground text-base leading-relaxed">
            {t("intro")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("lastUpdated", { date: lastUpdatedDate })}
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            {t("sections.onDevice.title")}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("sections.onDevice.description")}
          </p>
          <ul className="grid gap-4 md:grid-cols-2">
            {localDataPoints.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="border-border/60 bg-muted/30 rounded-2xl border p-4"
              >
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t("sections.onDevice.implementationDetail", {
              path: "src/server-actions/embed.ts",
            })}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            {t("sections.dataLeaves.title")}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("sections.dataLeaves.description")}
          </p>
          <ul className="space-y-3">
            {aiDisclosures.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="border-border/60 rounded-2xl border p-4"
              >
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
          <div className="text-muted-foreground text-sm leading-relaxed">
            <p>{t("sections.dataLeaves.noAnalytics")}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            {t("sections.controls.title")}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("sections.controls.description")}
          </p>
          <ul className="grid gap-4 md:grid-cols-3">
            {userControls.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="rounded-2xl border p-4"
              >
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            {t("sections.children.title")}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("sections.children.description")}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            {t("sections.contact.title")}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("sections.contact.descriptionPrefix")}
            <a
              href="https://github.com/brunocpf/mnemos"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:text-primary/80 font-medium"
            >
              {t("sections.contact.linkText")}
            </a>{" "}
            {t("sections.contact.descriptionSuffix")}
          </p>
        </section>
      </main>
    </ViewTransition>
  );
}
