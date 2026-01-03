"use client";

import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

function useIOSKeyboardOffset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const set = (e: Event) => {
      const bottomCovered = Math.max(
        0,
        window.innerHeight - (vv.height + vv.offsetTop),
      );
      console.log("vv resize/scroll/orientationchange", { e, bottomCovered });
      document.documentElement.style.setProperty("--kb", `${bottomCovered}px`);
    };

    vv.addEventListener("resize", set);
    vv.addEventListener("scroll", set);
    window.addEventListener("orientationchange", set);
    set(new Event("init"));

    return () => {
      vv.removeEventListener("resize", set);
      vv.removeEventListener("scroll", set);
      window.removeEventListener("orientationchange", set);
      document.documentElement.style.removeProperty("--kb");
    };
  }, []);
}

export function AppFooter() {
  useIOSKeyboardOffset();

  return (
    <footer
      className={cn(
        "text-muted-foreground from-background bottom-0 z-50 w-full bg-linear-to-t to-transparent py-4 text-sm [view-transition-class:fixed] [view-transition-name:app-footer]",
        {
          fixed: true,
          // absolute: inputFocused,
        },
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-6">
        <InputGroup className="flex-1">
          <InputGroupAddon aria-hidden="true">
            <IconSearch className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search notes"
            placeholder="Search notes…"
            className="text-base sm:text-sm"
            suppressHydrationWarning
          />
        </InputGroup>
        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label="New note"
        >
          <IconPlus />
        </Button>
      </div>
    </footer>
  );
}
