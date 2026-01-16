"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { toast } from "sonner";

import type { Settings } from "@/client-data/settings";
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
import { Link } from "@/i18n/navigation";
import { useEmbedder } from "@/providers/embedder-provider";
import { useSettings } from "@/providers/settings-provider";
import { useSummarizer } from "@/providers/summarizer-provider";

export function SettingsView() {
  const tShared = useTranslations("Shared");
  const t = useTranslations("SettingsView");
  const { settings, changeSetting } = useSettings();
  const { modelDownloadState: summarizerDownloadState } = useSummarizer();
  const { modelDownloadState: embedderDownloadState } = useEmbedder();

  const summarizerOptions: {
    value: Settings["summarizerHost"];
    label: string;
    description: string;
  }[] = [
    {
      value: "local-only",
      label: t("summaries.options.localOnly.label"),
      description: t("summaries.options.localOnly.description"),
    },
    {
      value: "allow-fallback",
      label: t("summaries.options.allowFallback.label"),
      description: t("summaries.options.allowFallback.description"),
    },
    {
      value: "server-only",
      label: t("summaries.options.serverOnly.label"),
      description: t("summaries.options.serverOnly.description"),
    },
  ];

  const embeddingOptions: {
    value: Settings["embeddingHost"];
    label: string;
    description: string;
  }[] = [
    {
      value: "local-only",
      label: t("embeddings.options.localOnly.label"),
      description: t("embeddings.options.localOnly.description"),
    },
    {
      value: "allow-fallback",
      label: t("embeddings.options.allowFallback.label"),
      description: t("embeddings.options.allowFallback.description"),
    },
  ];

  const handleSettingChange = <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => {
    (() => {
      changeSetting(key, value);
    })();

    toast.success(t("preferencesUpdated"), { position: "top-center" });
  };

  const shouldShowSummarizerProgress =
    settings.summarizerHost === "local-only" ||
    settings.summarizerHost === "allow-fallback";

  const shouldShowEmbedderProgress =
    settings.embeddingHost === "local-only" ||
    settings.embeddingHost === "allow-fallback";

  const summarizerFileEntries = useMemo(() => {
    const fileStates = summarizerDownloadState?.fileStates ?? {};
    const entries = Object.entries(fileStates).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    if (entries.length > 0) return entries;
    if (!summarizerDownloadState) return [];

    return [["model", { status: "download" as const }]] as const;
  }, [summarizerDownloadState]);

  const embedderFileEntries = useMemo(() => {
    const fileStates = embedderDownloadState?.fileStates ?? {};
    const entries = Object.entries(fileStates).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    if (entries.length > 0) return entries;
    if (!embedderDownloadState) return [];

    return [["model", { status: "download" as const }]] as const;
  }, [embedderDownloadState]);

  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-3">
        <h1 className="mn-page-title-scroll text-2xl font-semibold select-none">
          {tShared("navigation.settings")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("pageDescription")}</p>
      </header>

      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("summaries.title")}</CardTitle>
            <CardDescription>{t("summaries.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="summarizer-host">{t("summaries.label")}</Label>
            <Select
              value={settings.summarizerHost}
              itemToStringLabel={(itemValue) => {
                return (
                  summarizerOptions.find((s) => s.value === itemValue)?.label ??
                  ""
                );
              }}
              onValueChange={(value) =>
                handleSettingChange(
                  "summarizerHost",
                  value as Settings["summarizerHost"],
                )
              }
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

            {shouldShowSummarizerProgress && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">
                  {summarizerDownloadState?.isReady
                    ? t("modelDownload.readyIndicator.ready")
                    : t("modelDownload.readyIndicator.notReady")}
                </p>
                {summarizerFileEntries.map(([fileName, fileState]) => {
                  const label =
                    fileName === "model"
                      ? t("modelDownload.title")
                      : (fileName.split("/").pop() ?? fileName);
                  const rawPercent =
                    fileState.status !== "download"
                      ? fileState.progress
                      : undefined;
                  const percent =
                    typeof rawPercent === "number"
                      ? rawPercent
                      : fileState.status === "done"
                        ? 100
                        : undefined;
                  const isReady = !!summarizerDownloadState?.isReady;
                  const value = isReady
                    ? 100
                    : typeof percent === "number"
                      ? percent
                      : null;

                  const percentLabel = isReady
                    ? "100%"
                    : typeof percent === "number"
                      ? `${Math.round(percent)}%`
                      : "";

                  const statusLabel =
                    fileState.status === "done"
                      ? t("modelDownload.status.ready")
                      : t("modelDownload.status.downloading");

                  return (
                    <Progress
                      key={fileName}
                      value={value}
                      className="gap-1"
                      aria-label={label}
                    >
                      <ProgressLabel className="text-xs font-medium">
                        {label}
                      </ProgressLabel>
                      <ProgressValue className="text-xs">
                        {() =>
                          percentLabel
                            ? `${percentLabel} \u00b7 ${statusLabel}`
                            : statusLabel
                        }
                      </ProgressValue>
                    </Progress>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("embeddings.title")}</CardTitle>
            <CardDescription>{t("embeddings.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="embedding-host">{t("embeddings.label")}</Label>
            <Select
              value={settings.embeddingHost}
              itemToStringLabel={(itemValue) => {
                return (
                  embeddingOptions.find((s) => s.value === itemValue)?.label ??
                  ""
                );
              }}
              onValueChange={(value) =>
                handleSettingChange(
                  "embeddingHost",
                  value as Settings["embeddingHost"],
                )
              }
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

            {shouldShowEmbedderProgress && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">
                  {embedderDownloadState?.isReady
                    ? t("modelDownload.readyIndicator.ready")
                    : t("modelDownload.readyIndicator.notReady")}
                </p>
                {embedderFileEntries.map(([fileName, fileState]) => {
                  const label =
                    fileName === "model"
                      ? t("modelDownload.title")
                      : (fileName.split("/").pop() ?? fileName);
                  const rawPercent =
                    fileState.status !== "download"
                      ? fileState.progress
                      : undefined;
                  const percent =
                    typeof rawPercent === "number"
                      ? rawPercent
                      : fileState.status === "done"
                        ? 100
                        : undefined;
                  const isReady = !!embedderDownloadState?.isReady;
                  const value = isReady
                    ? 100
                    : typeof percent === "number"
                      ? percent
                      : null;

                  const percentLabel = isReady
                    ? "100%"
                    : typeof percent === "number"
                      ? `${Math.round(percent)}%`
                      : "";

                  const statusLabel =
                    fileState.status === "done"
                      ? t("modelDownload.status.ready")
                      : t("modelDownload.status.downloading");

                  return (
                    <Progress
                      key={fileName}
                      value={value}
                      className="gap-1"
                      aria-label={label}
                    >
                      <ProgressLabel className="text-xs font-medium">
                        {label}
                      </ProgressLabel>
                      <ProgressValue className="text-xs">
                        {() =>
                          percentLabel
                            ? `${percentLabel} \u00b7 ${statusLabel}`
                            : statusLabel
                        }
                      </ProgressValue>
                    </Progress>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("notifications.title")}</CardTitle>
            <CardDescription>{t("notifications.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{t("notifications.toggleTitle")}</p>
              <p className="text-muted-foreground text-sm">
                {t("notifications.toggleDescription")}
              </p>
            </div>
            <Switch
              checked={settings.dismissEmbeddingErrorMessages}
              onCheckedChange={(checked) =>
                handleSettingChange("dismissEmbeddingErrorMessages", checked)
              }
            />
          </CardContent>
        </Card>
      </section>

      <p className="text-muted-foreground text-sm">
        {t.rich("privacyPrompt", {
          link: (chunks) => (
            <Link
              href="/privacy-policy"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
