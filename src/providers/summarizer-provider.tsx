"use client";

import { proxy } from "comlink";
import {
  createContext,
  PropsWithChildren,
  use,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useComlinkWorker } from "@/hooks/use-comlink-worker";
import { ModelDownloadState } from "@/lib/hf-model-worker-service";
import { withTimeout } from "@/lib/with-timeout";
import { useSettings } from "@/providers/settings-provider";
import { summarize } from "@/server-actions/summarize";
import type { SummarizationWorkerApi } from "@/workers/summarization.worker";

const modelId =
  process.env.NEXT_PUBLIC_SUMMARIZATION_MODEL_ID ||
  "onnx-community/Phi-3.5-mini-instruct-onnx-web";

export interface SummarizerContextValue {
  summarize: (text: string) => Promise<
    | {
        status: "success";
        host: "local" | "server";
        result: string;
      }
    | {
        status: "error";
        host: "local" | "server";
        error: string;
      }
  >;
  isReady: boolean;
  modelId?: string;
  modelDownloadState?: ModelDownloadState;
}
export const SummarizerContext = createContext<SummarizerContextValue>({
  summarize: async () => {
    throw new Error("Not implemented");
  },
  isReady: false,
  modelId: "unknown",
  modelDownloadState: undefined,
});

export function SummarizerProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const { proxy: summarizerWorkerApi } =
    useComlinkWorker<SummarizationWorkerApi>(
      () =>
        new Worker(
          new URL("@/workers/summarization.worker.ts", import.meta.url),
          {
            type: "module",
          },
        ),
      [],
    );
  const [modelDownloadState, setModelDownloadState] =
    useState<ModelDownloadState>();

  useEffect(() => {
    let subscriptionId: number | undefined;

    async function initWorker() {
      setModelDownloadState(undefined);
      await summarizerWorkerApi?.init();
      subscriptionId = await summarizerWorkerApi?.subscribeDownloadState(
        proxy((state) => {
          setModelDownloadState(state);
        }),
      );
    }

    if (settings.summarizerHost !== "server-only") {
      initWorker();
    }

    return () => {
      if (subscriptionId !== undefined) {
        summarizerWorkerApi?.unsubscribeDownloadState(subscriptionId);
      }
    };
  }, [settings.summarizerHost, summarizerWorkerApi]);

  const contextValue = useMemo<SummarizerContextValue>(() => {
    const workerIsReady =
      summarizerWorkerApi !== null && !!modelDownloadState?.isReady;
    const serverIsReady = navigator.onLine;
    const fallbackTimeoutMs = 30_000;
    const isReady =
      {
        "server-only": serverIsReady,
        "local-only": workerIsReady,
        "allow-fallback": workerIsReady || serverIsReady,
      }[settings.summarizerHost] || false;

    const getErrorMessage = (error: unknown) =>
      error instanceof Error ? error.message : String(error);

    const callServer = async (text: string) => {
      const result = await summarize(text);
      return {
        status: "success",
        host: "server",
        result,
      } as const;
    };

    const callLocal = async (text: string) => {
      if (!workerIsReady) {
        throw new Error("Summarizer worker is not ready");
      }
      const result = await summarizerWorkerApi!.summarize(text);
      return {
        status: "success",
        host: "local",
        result,
      } as const;
    };

    return {
      summarize: async (text: string) => {
        switch (settings.summarizerHost) {
          case "server-only":
            return callServer(text);

          case "local-only":
            try {
              return await callLocal(text);
            } catch (error: unknown) {
              return {
                status: "error",
                host: "local",
                error: getErrorMessage(error),
              } as const;
            }

          case "allow-fallback": {
            try {
              if (workerIsReady) {
                const localPromise = callLocal(text);
                // If we fall back, avoid unhandled rejections from the abandoned promise.
                localPromise.catch(() => undefined);

                return serverIsReady
                  ? await withTimeout(localPromise, fallbackTimeoutMs)
                  : await localPromise;
              }
            } catch {
              // fall back to server
            }
            return callServer(text);
          }
        }
      },
      modelDownloadState,
      modelId,
      isReady,
    };
  }, [modelDownloadState, settings.summarizerHost, summarizerWorkerApi]);

  return (
    <SummarizerContext.Provider value={contextValue}>
      {children}
    </SummarizerContext.Provider>
  );
}

export function useSummarizer() {
  return use(SummarizerContext);
}
