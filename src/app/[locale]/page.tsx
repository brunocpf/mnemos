import { getTranslations } from "next-intl/server";
import { ViewTransition } from "react";

import { AppFooterSlot } from "@/components/app-footer-slot";
import NotesList from "@/components/notes-list";
import SearchInput from "@/components/search-input";

export default async function Home() {
  const t = await getTranslations("Shared");
  const title = t("navigation.yourNotes");

  return (
    <>
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
          <h1 className="mn-page-title-scroll text-2xl font-semibold select-none">
            {title}
          </h1>
          <section className="space-y-4 overflow-x-hidden pb-2">
            <NotesList />
          </section>
        </main>
      </ViewTransition>
      <AppFooterSlot>
        <SearchInput />
      </AppFooterSlot>
    </>
  );
}
