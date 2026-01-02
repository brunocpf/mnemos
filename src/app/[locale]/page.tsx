import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function Home() {
  const t = await getTranslations("Shared");
  const title = t("Your Notes");

  return (
    <div className="relative pb-32">
      <main className="mx-auto flex max-w-5xl flex-col gap-2 px-6 pb-16">
        <h1 className="animate-[fade-out_1s_ease-in-out_0s_both] text-2xl font-semibold select-none [animation-range:calc(var(--spacing)*3)_calc(var(--spacing)*6)] [animation-timeline:scroll(root)]">
          {title}
        </h1>
        <section className="space-y-4">
          <div className="bg-foreground/20 h-1000 border-4 border-amber-50">
            <Link href="/subpath/subpath2">Go to subpath</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
