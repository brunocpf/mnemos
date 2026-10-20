import { ViewTransition } from "react";

import { AppFooterSlot } from "@/components/app-footer-slot";
import { FolderBrowser } from "@/components/folder-browser";
import SearchInput from "@/components/search-input";

// The folder id is read from the URL on the client, not from `params`: the
// service worker serves one precached shell for every folder when offline.
export default function FolderPage() {
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
          <section className="space-y-4 overflow-x-hidden pb-2">
            <FolderBrowser isFolderRoute />
          </section>
        </main>
      </ViewTransition>
      <AppFooterSlot>
        <SearchInput />
      </AppFooterSlot>
    </>
  );
}
