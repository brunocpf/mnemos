import { ViewTransition } from "react";

import NoteView from "@/components/note-view";

export default async function NotePage({
  searchParams,
}: PageProps<"/[locale]/note">) {
  const noteId = (await searchParams).noteId?.toString();

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
        <section className="space-y-4 pb-2">
          <NoteView noteId={noteId} />
        </section>
      </main>
    </ViewTransition>
  );
}
