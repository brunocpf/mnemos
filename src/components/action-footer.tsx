"use client";

import { Route } from "next";
import Link from "next/link";
import { Activity } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ActionFooterProps {
  placeholder?: string;
  buttonLabel: string;
  buttonHref: Route;
  searchValue: string;
  onSearchChange: (value: string) => void;
  isSearching?: boolean;
}

export function ActionFooter({
  placeholder = "Search...",
  buttonLabel,
  buttonHref,
  searchValue,
  onSearchChange,
  isSearching = false,
}: ActionFooterProps) {
  return (
    <footer className="fixed right-0 bottom-4 left-0 z-20 px-4">
      <div className="border-border/70 dark:bg-background/80 mx-auto max-w-4xl rounded-2xl border bg-white/90 p-4 shadow-xl shadow-black/10 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search</span>
            <input
              type="search"
              placeholder={placeholder}
              className="border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-primary/20 dark:bg-background w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-inner focus:ring-2 focus:outline-none"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-busy={isSearching}
              aria-label={placeholder}
            />
            <Activity mode={isSearching ? "visible" : "hidden"}>
              <Spinner className="text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2" />
            </Activity>
          </label>
          <Button
            nativeButton={false}
            variant="default"
            render={<Link href={buttonHref} />}
          >
            {buttonLabel}
          </Button>
        </div>
        <p className="text-muted-foreground text-center text-xs leading-relaxed sm:text-right">
          Mnemos never syncs notes without your say-so.{" "}
          <Link
            href="/privacy"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </footer>
  );
}
