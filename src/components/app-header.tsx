"use client";

import { IconChevronLeft, IconDots } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import {
  Activity,
  addTransitionType,
  startTransition,
  ViewTransition,
} from "react";

import { Button } from "@/components/ui/button";
import { useBoundingClientCustomProperties } from "@/hooks/use-bounding-client-vars";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useHistoryStack } from "@/providers/history-provider";

export function AppHeader() {
  const headerRef = useBoundingClientCustomProperties("mn-header");

  const pathname = usePathname();
  const router = useRouter();
  const { previous, pop } = useHistoryStack();
  const t = useTranslations("Shared");

  const parentPath = pathname.split("/").slice(0, -1).join("/") || "/";
  const pageToGoBack = previous || parentPath;

  const title =
    {
      "/": t("Your Notes"),
      "/note/new": t("New Note"),
    }[pathname] || "Mnemos";

  const handleBack = () => {
    startTransition(() => {
      addTransitionType("navigation-back");
      pop();
      router.push(pageToGoBack, { scroll: true });
    });
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 flex w-full snap-start pt-[env(safe-area-inset-top)]"
    >
      <div className="bg-background/70 mn-header-bg-scroll absolute inset-0 mask-[linear-gradient(to_bottom,black,rgba(1,1,1,0.9),rgba(1,1,1,0.01))] backdrop-blur-xs" />
      <div className="isolate mx-auto grid w-full max-w-5xl grid-cols-[auto_1fr_auto] place-items-center px-6 py-4 [view-transition-class:fixed-fg] [view-transition-name:app-header-fg]">
        <Activity
          mode={!!pageToGoBack && pathname !== "/" ? "visible" : "hidden"}
        >
          <ViewTransition default="fixed-fg">
            <Button
              aria-label={t("Go Back")}
              className="col-start-1"
              onClick={handleBack}
              variant="outline"
              size="icon-xl"
            >
              <IconChevronLeft />
            </Button>
          </ViewTransition>
        </Activity>
        <Activity mode={title ? "visible" : "hidden"}>
          <ViewTransition default="fixed-fg">
            <h2 className="mn-header-title-scroll col-start-2 text-sm font-semibold select-none">
              {title}
            </h2>
          </ViewTransition>
        </Activity>
        <Button
          variant="outline"
          size="icon-xl"
          aria-label="Submit"
          className="col-start-3"
          onFocus={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <IconDots />
        </Button>
      </div>
    </header>
  );
}
