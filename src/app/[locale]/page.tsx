import { getTranslations } from "next-intl/server";
import { ViewTransition } from "react";

import { Link } from "@/i18n/navigation";

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
      <div className="relative pb-32">
        <main className="mx-auto flex max-w-5xl flex-col gap-2 px-6 pb-16">
          <h1 className="animate-[fade-out_ease-in-out_both] snap-end text-2xl font-semibold select-none [animation-range:calc(var(--spacing)*3)_calc(var(--spacing)*6)] [animation-timeline:scroll(root)]">
            {title}
          </h1>
          <section className="snap-start scroll-mt-15 scroll-mb-30 space-y-4">
            <div className="bg-foreground/20 h-1000 border-4 border-amber-50 p-30">
              <Link className="pt-30" href="/subpath/subpath2">
                Go to subpath
              </Link>
            </div>
          </section>
        </main>
      </div>
    </ViewTransition>
  );
}
