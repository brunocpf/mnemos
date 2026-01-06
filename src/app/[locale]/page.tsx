import { getTranslations } from "next-intl/server";
import { ViewTransition } from "react";

import NotesList from "@/components/notes-list";

export default async function Home() {
  const t = await getTranslations("Shared");
  const title = t("Your Notes");

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
      <main className="mx-auto flex max-w-5xl flex-col gap-2 px-6 pb-16">
        <h1 className="mn-page-title-scroll snap-end text-2xl font-semibold select-none">
          {title}
        </h1>
        <section className="mn-snap-section snap-start space-y-4 overflow-x-hidden pb-2">
          <NotesList />
        </section>
      </main>
    </ViewTransition>
  );
}
