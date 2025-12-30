"use client";

import Link from "next/link";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import type { Settings } from "@/client-data/settings";
import { settingsSchema } from "@/client-data/settings";
import { BackButton } from "@/components/back-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSummarizationWorker } from "@/hooks/use-summarization-worker";
import { SettingsService } from "@/services/settings-service";
import type { ModelDownloadProgress } from "@/workers/summarization.worker";

const summarizerOptions: Array<{
  value: Settings["summarizerHost"];
  label: string;
  description: string;
}> = [
  {
    value: "local-only",
    label: "Local only",
    description: "Run the Phi-3.5 summarizer entirely on this device.",
  },
  {
    value: "allow-fallback",
    label: "Allow fallback",
    description:
      "Try the local worker first, then call the cloud helper if it fails.",
  },
  {
    value: "server-only",
    label: "Server only",
    description:
      "Always send summaries to Mnemos' server action (requires internet).",
  },
];

const embeddingOptions: Array<{
  value: Settings["embeddingHost"];
  label: string;
  description: string;
}> = [
  {
    value: "local-only",
    label: "Local only",
    description: "Derive embeddings with the on-device transformer.",
  },
  {
    value: "allow-fallback",
    label: "Allow fallback",
    description:
      "Retry in the cloud when the local worker errors or times out.",
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const serviceRef = useRef<SettingsService | null>(null);
  const defaultSettings = useMemo(() => settingsSchema.parse({}), []);
  const { preloadModel, modelDownloadState } = useSummarizationWorker();

  const ensureService = useCallback(() => {
    if (serviceRef.current) {
      return serviceRef.current;
    }

    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return null;
    }

    serviceRef.current = new SettingsService(localStorage);
    return serviceRef.current;
  }, []);

  useEffect(() => {
    const service = ensureService();
    if (!service) return;

    startTransition(() => {
      setSettings(service.settings);
    });
  }, [ensureService]);

  const handleSettingChange = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      const service = ensureService();
      if (!service) {
        toast.error("Settings unavailable", {
          description: "Settings are unavailable in this environment.",
          position: "top-center",
        });
        return;
      }

      try {
        service.setSetting(key, value);
        setSettings(service.settings);

        toast.success("Preferences updated", {
          position: "top-center",
        });
      } catch (error) {
        toast.error("Could not update preferences", {
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while saving your settings.",
          position: "top-center",
        });
      }
    },
    [ensureService],
  );

  const currentSettings = settings ?? defaultSettings;
  const isHydrated = settings !== null;

  const modelDownloadPercent =
    modelDownloadState.state === "loading" ||
    modelDownloadState.state === "error"
      ? modelDownloadState.progress?.percent
      : undefined;

  const modelFileProgressEntries: Array<[string, ModelDownloadProgress]> | [] =
    modelDownloadState.state === "loading" ||
    modelDownloadState.state === "error"
      ? modelDownloadState.files
        ? Object.entries(modelDownloadState.files).sort(([a], [b]) =>
            a.localeCompare(b),
          )
        : []
      : [];

  useEffect(() => {
    if (!isHydrated) return;
    if (currentSettings.summarizerHost === "server-only") return;

    void preloadModel().catch(() => {
      // The worker will surface errors in modelDownloadState.
    });
  }, [currentSettings.summarizerHost, isHydrated, preloadModel]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.4em] uppercase">
              Preferences
            </p>
            <h1 className="text-3xl font-semibold">Settings</h1>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Decide where Mnemos runs heavy AI workloads and how often you hear
          about local indexing hiccups.
        </p>
      </div>

      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Summaries</CardTitle>
            <CardDescription>
              Choose whether to summarize notes locally, remotely, or with an
              automatic fallback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="summarizer-host">Summaries run on</Label>
            <Select
              value={currentSettings.summarizerHost}
              onValueChange={(value) =>
                handleSettingChange(
                  "summarizerHost",
                  value as Settings["summarizerHost"],
                )
              }
              disabled={!isHydrated}
            >
              <SelectTrigger
                id="summarizer-host"
                className="w-full justify-between"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" className="w-full min-w-0">
                {summarizerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex flex-col text-left">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {option.description}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentSettings.summarizerHost !== "server-only" &&
              (modelDownloadState.state === "loading" ||
                modelDownloadState.state === "error") && (
                <div className="space-y-2">
                  <Progress
                    value={
                      typeof modelDownloadPercent === "number"
                        ? modelDownloadPercent
                        : null
                    }
                    aria-label="Local summarizer model download progress"
                  >
                    <ProgressLabel>Local model download</ProgressLabel>
                    <ProgressValue>
                      {(formattedValue, value) => {
                        if (typeof modelDownloadPercent === "number") {
                          return `${Math.round(modelDownloadPercent)}%`;
                        }

                        if (modelDownloadState.state === "loading") {
                          return "Starting...";
                        }

                        return formattedValue ?? (value ? `${value}%` : "");
                      }}
                    </ProgressValue>
                  </Progress>

                  {modelFileProgressEntries.length > 0 && (
                    <div className="space-y-2">
                      {modelFileProgressEntries.map(([file, progress]) => {
                        const percent = progress.percent;
                        const label = file.split("/").pop() ?? file;

                        return (
                          <Progress
                            key={file}
                            value={typeof percent === "number" ? percent : null}
                            className="gap-1"
                            aria-label={`Downloading ${label}`}
                          >
                            <ProgressLabel className="text-xs font-medium">
                              {label}
                            </ProgressLabel>
                            <ProgressValue className="text-xs">
                              {() =>
                                typeof percent === "number"
                                  ? `${Math.round(percent)}%`
                                  : ""
                              }
                            </ProgressValue>
                          </Progress>
                        );
                      })}
                    </div>
                  )}

                  {modelDownloadState.state === "error" && (
                    <p className="text-destructive text-sm">
                      {modelDownloadState.error}
                    </p>
                  )}
                </div>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Embeddings</CardTitle>
            <CardDescription>
              Control how Mnemos indexes notes for semantic search and when to
              fall back to the cloud.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="embedding-host">Embeddings run on</Label>
            <Select
              value={currentSettings.embeddingHost}
              onValueChange={(value) =>
                handleSettingChange(
                  "embeddingHost",
                  value as Settings["embeddingHost"],
                )
              }
              disabled={!isHydrated}
            >
              <SelectTrigger
                id="embedding-host"
                className="w-full justify-between"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" className="w-full min-w-0">
                {embeddingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex flex-col text-left">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {option.description}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Mute local indexing error toasts once you are confident in your
              setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Hide local indexing alerts</p>
              <p className="text-muted-foreground text-sm">
                Prevent Mnemos from showing fallback prompts when embeddings
                fail.
              </p>
            </div>
            <Switch
              checked={currentSettings.dismissEmbeddingErrorMessages}
              onCheckedChange={(checked) =>
                handleSettingChange("dismissEmbeddingErrorMessages", checked)
              }
              disabled={!isHydrated}
            />
          </CardContent>
        </Card>
      </section>

      <p className="text-muted-foreground text-sm">
        Looking for a privacy refresher? Head over to the{" "}
        <Link
          href="/privacy"
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
