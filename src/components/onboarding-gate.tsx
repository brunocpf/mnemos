"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STORAGE_KEY = "mnemos:onboardingSeen:v1";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // If storage is unavailable, assume "seen" so we don't block.
    return true;
  }
}

function getServerSnapshot() {
  // The server can't know localStorage. Default to "seen" to avoid
  // hydration mismatches; first-time users will see the overlay after hydrate.
  return true;
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const hasSeenOnboarding = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore write failures.
    }
    setIsDismissed(true);
  }, []);

  const isOpen = !isDismissed && !hasSeenOnboarding;

  return (
    <>
      {children}

      {isOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="bg-background/80 fixed inset-0 backdrop-blur" />
          <div className="fixed inset-0 overflow-y-auto px-6 py-10">
            <div className="mx-auto flex min-h-full max-w-2xl items-center">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Welcome to Mnemos</CardTitle>
                  <CardDescription>
                    A privacy-first, offline-capable notes app. Everything stays
                    on your device unless you explicitly ask for AI features.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="text-muted-foreground list-disc space-y-2 pl-5">
                    <li>
                      Create notes on your device (stored in your browser via
                      IndexedDB).
                    </li>
                    <li>
                      Search by meaning using embeddings on your device (works
                      offline).
                    </li>
                    <li>
                      AI actions (summaries / Q&amp;A) are opt-in and only run
                      when you trigger them.
                    </li>
                  </ul>

                  <p className="text-muted-foreground text-sm">
                    Tip: the first run may download an embedding model to your
                    device.
                  </p>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <Button onClick={handleDismiss} className="w-full sm:w-auto">
                    Get started
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    render={<Link href="/privacy" />}
                  >
                    Read privacy policy
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
