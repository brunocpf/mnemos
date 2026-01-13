import { ViewTransition } from "react";

export default async function Home() {
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
        <section className="h-1000 scroll-mb-40 space-y-4 overflow-x-hidden pb-2">
          <p>New Note</p>
        </section>
      </main>
    </ViewTransition>
  );
}
