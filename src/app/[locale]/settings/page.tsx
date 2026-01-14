import { ViewTransition } from "react";

import { SettingsView } from "@/components/settings-view";

export default async function SettingsPage() {
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
          <SettingsView />
        </section>
      </main>
    </ViewTransition>
  );
}
