"use client";

import { useCallback, useMemo } from "react";

import type { Settings } from "@/client-data/settings";
import { useSummarizationWorker } from "@/hooks/use-summarization-worker";
import { summarize as summarizeServerAction } from "@/server-actions/summarize";
import { SettingsService } from "@/services/settings-service";

const DEFAULT_LOCAL_TIMEOUT_MS = 30_000;

type SummarizerHost = Settings["summarizerHost"];

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function normalizeSummaryOutput(summary: string) {
  const trimmed = summary.trim();
  if (!trimmed) {
    throw new Error("The summarization returned an empty response.");
  }
  return trimmed;
}

export function useSummarizer(options?: { localTimeoutMs?: number }) {
  const settingsService = useMemo<SettingsService | null>(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return null;
    }

    return new SettingsService(localStorage);
  }, []);
  const { summarize: summarizeLocally, isReady: isWorkerReady } =
    useSummarizationWorker();

  const getHostPreference = useCallback((): SummarizerHost => {
    return settingsService?.getSetting("summarizerHost") ?? "allow-fallback";
  }, [settingsService]);

  const summarizeWithServer = useCallback(async (text: string) => {
    const summary = await summarizeServerAction(text);
    return normalizeSummaryOutput(summary);
  }, []);

  const localTimeoutMs = options?.localTimeoutMs ?? DEFAULT_LOCAL_TIMEOUT_MS;

  const summarize = useCallback(
    async (text: string) => {
      const preference = getHostPreference();

      if (preference === "server-only") {
        return summarizeWithServer(text);
      }

      if (preference === "local-only") {
        if (!isWorkerReady) {
          throw new Error("The local summarization model is still loading.");
        }

        return withTimeout(
          summarizeLocally(text),
          localTimeoutMs,
          `Local summarization timed out after ${localTimeoutMs}ms.`,
        );
      }

      if (isWorkerReady) {
        try {
          return await withTimeout(
            summarizeLocally(text),
            localTimeoutMs,
            `Local summarization timed out after ${localTimeoutMs}ms.`,
          );
        } catch (error) {
          console.warn(
            "Local summarization failed, falling back to server.",
            error,
          );
        }
      }

      return summarizeWithServer(text);
    },
    [
      getHostPreference,
      isWorkerReady,
      localTimeoutMs,
      summarizeLocally,
      summarizeWithServer,
    ],
  );

  const isReady = useMemo(() => {
    const preference = getHostPreference();
    return preference === "local-only" ? isWorkerReady : true;
  }, [getHostPreference, isWorkerReady]);

  return { summarize, isReady };
}
