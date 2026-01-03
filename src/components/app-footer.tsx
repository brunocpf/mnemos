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

export function useKeyboardVars() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    // Baseline when keyboard is closed
    let baseline = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
    );

    const set = () => {
      // refresh baseline when we're basically "full height"
      const currentMax = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight,
      );
      if (vv.height >= baseline - 40)
        baseline = Math.max(baseline, currentMax, vv.height);

      const kb = Math.max(0, baseline - vv.height);
      document.documentElement.style.setProperty("--kb", `${kb}px`);

      // optional: also expose offsetTop if you want to counter pan
      document.documentElement.style.setProperty(
        "--vv-top",
        `${vv.offsetTop}px`,
      );
    };

    vv.addEventListener("resize", set);
    vv.addEventListener("scroll", set);
    window.addEventListener("orientationchange", set);
    set();

    return () => {
      vv.removeEventListener("resize", set);
      vv.removeEventListener("scroll", set);
      window.removeEventListener("orientationchange", set);
      document.documentElement.style.removeProperty("--kb");
      document.documentElement.style.removeProperty("--vv-top");
    };
  }, []);
}

export function AppFooter() {
  useKeyboardVars();

  return (
    <footer
      className={cn(
        "text-muted-foreground from-background bottom-0 z-50 w-full bg-linear-to-t to-transparent pt-4 pb-[max(calc(var(--spacing)*4),env(safe-area-inset-bottom))] text-sm [view-transition-class:fixed] [view-transition-name:app-footer]",
        {
          fixed: true,
          // absolute: inputFocused,
        },
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-6">
        <InputGroup className="flex-1 p-2">
          <InputGroupAddon aria-hidden="true">
            <IconSearch className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search notes"
            placeholder="Search notes…"
            className="text-base"
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
