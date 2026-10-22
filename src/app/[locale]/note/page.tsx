import { ViewTransition } from "react";

import { NoteView } from "@/components/note-view";

// noteId, folderId, new and highlight are read from the URL on the client (see
// NoteView), not from `searchParams`: the service worker serves one precached
// shell for every note when offline.
export default function NotePage() {
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
          <NoteView />
        </section>
      </main>
    </ViewTransition>
  );
}
