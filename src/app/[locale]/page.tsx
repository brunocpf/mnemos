import { getTranslations } from "next-intl/server";
import { ViewTransition } from "react";

import { Link } from "@/i18n/navigation";

import { TempSuspenseComponent } from "./temp-suspendable-component";

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
          <h1 className="mn-page-title-scroll text-2xl font-semibold select-none">
            {" "}
            {/* snap-end */}
            {title}
          </h1>
          <section className="mn-snap-section h-1000 space-y-4 overflow-x-hidden bg-red-50">
            {" "}
            {/* snap-start */}
            <TempSuspenseComponent />
            <Link href="/subpath/subpath2">Go to subpath</Link>
          </section>
        </main>
      </div>
    </ViewTransition>
  );
}
