import { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface ActionFooterProps {
  placeholder?: string;
  buttonLabel: string;
  buttonHref: Route;
}

export function ActionFooter({
  placeholder = "Search...",
  buttonLabel,
  buttonHref,
}: ActionFooterProps) {
  return (
    <footer className="fixed right-0 bottom-4 left-0 z-20 px-4">
      <div className="border-border/70 dark:bg-background/80 mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border bg-white/90 p-4 shadow-xl shadow-black/10 backdrop-blur sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="sr-only">Search</span>
          <input
            type="search"
            placeholder={placeholder}
            className="border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-primary/20 dark:bg-background w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-inner focus:ring-2 focus:outline-none"
          />
        </label>
        <Button
          nativeButton={false}
          variant="default"
          render={<Link href={buttonHref} />}
        >
          {buttonLabel}
        </Button>
      </div>
    </footer>
  );
}
