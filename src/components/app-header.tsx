"use client";

import {
  IconChevronLeft,
  IconDots,
  IconPencilPlus,
  IconSettings,
  IconShieldLock,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import {
  Activity,
  addTransitionType,
  startTransition,
  ViewTransition,
} from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      "/": t("navigation.yourNotes"),
      "/note": t("navigation.note"),
    }[pathname] || "Mnemos";

  const handleBack = () => {
    startTransition(() => {
      addTransitionType("navigation-back");
      pop();
      router.push(pageToGoBack, { scroll: true });
    });
  };

  const handleNewNote = () => {
    router.push(`/note?new=${Date.now()}`, { scroll: true });
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
              aria-label={t("navigation.goBack")}
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon-xl"
                aria-label={t("navigation.menu")}
                className="col-start-3"
                onFocus={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <IconDots />
              </Button>
            }
          />
          <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
            <DropdownMenuItem onClick={handleNewNote}>
              <IconPencilPlus />
              {t("navigation.newNote")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/privacy-policy", { scroll: true })}
            >
              <IconShieldLock />
              {t("navigation.privacyPolicy")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/settings", { scroll: true })}
            >
              <IconSettings />
              {t("navigation.settings")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
