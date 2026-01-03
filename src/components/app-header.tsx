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
import { usePathname, useRouter } from "@/i18n/navigation";
import { useHistoryStack } from "@/providers/history-provider";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { previous, pop } = useHistoryStack();
  const t = useTranslations("Shared");

  const parentPath = pathname.split("/").slice(0, -1).join("/") || "/";
  const pageToGoBack = previous || parentPath;

  const title = pathname === "/" ? t("Your Notes") : "Mnemos";

  const handleBack = () => {
    startTransition(() => {
      addTransitionType("navigation-back");
      pop();
      router.push(pageToGoBack, { scroll: true });
    });
  };

  return (
    <header className="sticky top-0 z-50 flex w-full">
      <div
        className="bg-background/90 mn-header-bg-scroll absolute inset-0 mask-[linear-gradient(to_bottom,black_40%,transparent)] [view-transition-class:fixed-bg] [view-transition-name:app-header-bg]"
        aria-hidden="true"
      />
      <div className="isolate mx-auto grid w-full max-w-5xl grid-cols-[auto_1fr_auto] place-items-center px-6 py-4 [view-transition-class:fixed-fg] [view-transition-name:app-header-fg]">
        <Activity
          mode={!!pageToGoBack && pathname !== "/" ? "visible" : "hidden"}
        >
          <ViewTransition default="fixed-fg">
            <Button
              aria-label={t("Go Back")}
              className="col-start-1 cursor-pointer"
              onClick={handleBack}
              variant="outline"
              size="icon"
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
          size="icon"
          aria-label="Submit"
          className="col-start-3 cursor-pointer"
        >
          <IconDots />
        </Button>
      </div>
    </header>
  );
}
