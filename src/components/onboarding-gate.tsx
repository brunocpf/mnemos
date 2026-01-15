"use client";

import { useTranslations } from "next-intl";
import { useCallback, useSyncExternalStore, ViewTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Link } from "@/i18n/navigation";

const ONBOARDING_KEY = "mnemos:onboarding:v1";

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function OnboardingGate() {
  const t = useTranslations("Onboarding");

  const hydrated = useHydrated();

  const [hasSeenOnboarding, setHasSeenOnboarding] = useLocalStorage<boolean>(
    ONBOARDING_KEY,
    false,
  );

  const dismiss = useCallback(() => {
    setHasSeenOnboarding(true);
  }, [setHasSeenOnboarding]);

  if (!hydrated || hasSeenOnboarding) {
    return null;
  }

  return (
    <ViewTransition default="fixed-fg">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className="bg-background/80 fixed inset-0 z-10000 flex items-center justify-center p-6 backdrop-blur-sm"
      >
        <div className="w-full max-w-xl">
          <Card className="border-border/60">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl font-semibold">
                {t("title")}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {t("intro")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <section className="space-y-2">
                <h2 className="text-base font-semibold">{t("what.title")}</h2>
                <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm leading-relaxed">
                  <li>{t("what.bullets.capture")}</li>
                  <li>{t("what.bullets.search")}</li>
                  <li>{t("what.bullets.summaries")}</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold">{t("ai.title")}</h2>
                <div className="space-y-2 text-sm leading-relaxed">
                  <p className="text-muted-foreground">
                    <span className="text-foreground font-medium">
                      {t("ai.onDeviceLabel")}
                    </span>{" "}
                    {t("ai.onDevice")}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="text-foreground font-medium">
                      {t("ai.cloudLabel")}
                    </span>{" "}
                    {t("ai.cloud")}
                  </p>
                  <p className="text-muted-foreground">
                    {t("ai.settingsHint")}
                  </p>
                </div>
              </section>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <Button
                variant="outline"
                nativeButton={false}
                className="w-full"
                render={<Link href="/privacy-policy" onClick={dismiss} />}
              >
                {t("actions.privacy")}
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                className="w-full"
                render={<Link href="/settings" onClick={dismiss} />}
              >
                {t("actions.settings")}
              </Button>
              <Button onClick={dismiss} className="w-full">
                {t("actions.continue")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </ViewTransition>
  );
}
