"use client";

import { IconArrowLeft, IconDots } from "@tabler/icons-react";
import { Route } from "next";
import { useTranslations } from "next-intl";
import { ViewTransition } from "react";

import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";

export function AppHeader() {
  const pathname = usePathname();
  const t = useTranslations("Shared");

  const parentPath = (pathname.split("/").slice(0, -1).join("/") ||
    "/") as Route;

  const title = pathname === "/" ? t("Your Notes") : "";
  const canGoBack = parentPath !== pathname;

  return (
    <header className="sticky top-0 z-50 flex w-full">
      <div
        className="bg-background/90 absolute inset-0 animate-[header-reveal_1s_ease-in-out_0s_both] mask-[linear-gradient(to_bottom,black_40%,transparent)] backdrop-blur-sm [animation-range:calc(var(--spacing)*5)_calc(var(--spacing)*6)] [animation-timeline:scroll(root)]"
        aria-hidden="true"
      />
      <div className="isolate mx-auto grid w-full max-w-5xl grid-cols-[auto_1fr_auto] place-items-center px-6 py-4">
        {canGoBack ? (
          <ViewTransition>
            <Button
              nativeButton={false}
              variant="outline"
              size="icon"
              render={<Link href={parentPath} />}
            >
              <IconArrowLeft />
            </Button>
          </ViewTransition>
        ) : null}
        <h2 className="col-start-2 animate-[header-title-reveal_1s_ease-in-out_0s_both] text-sm font-semibold select-none [animation-range:calc(var(--spacing)*5)_calc(var(--spacing)*6)] [animation-timeline:scroll(root)]">
          {title}
        </h2>
        <Button variant="outline" size="icon" aria-label="Submit">
          <IconDots />
        </Button>
      </div>
    </header>
  );
}
