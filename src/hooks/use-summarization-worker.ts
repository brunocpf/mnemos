import * as Comlink from "comlink";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ModelDownloadState,
  SummarizationResult,
  SummarizationService,
} from "@/workers/summarization.worker";

export function useSummarizationWorker() {
  const workerProxy = useRef<Comlink.Remote<SummarizationService> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [modelDownloadState, setModelDownloadState] =
    useState<ModelDownloadState>({ state: "idle" });
  const subscriptionIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      startTransition(() => void setIsReady(false));
      return;
    }

    const worker = new Worker(
      new URL("@/workers/summarization.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerProxy.current = Comlink.wrap(worker);
    startTransition(() => void setIsReady(true));

    const subscribe = async () => {
      if (!workerProxy.current) return;

      try {
        const initial =
          (await workerProxy.current.getModelDownloadState()) as ModelDownloadState;
        startTransition(() => void setModelDownloadState(initial));

        const callback = Comlink.proxy((state: ModelDownloadState) => {
          startTransition(() => void setModelDownloadState(state));
        });

        const id = (await workerProxy.current.subscribeModelDownloadState(
          callback,
        )) as number;
        subscriptionIdRef.current = id;
      } catch {
        // If the worker API isn't available for some reason, ignore.
      }
    };

    void subscribe();

    return () => {
      setIsReady(false);
      const currentProxy = workerProxy.current;
      const subscriptionId = subscriptionIdRef.current;
      subscriptionIdRef.current = null;

      if (currentProxy && subscriptionId !== null) {
        void currentProxy.unsubscribeModelDownloadState(subscriptionId);
      }

      workerProxy.current = null;
      worker.terminate();
    };
  }, []);

  const preloadModel = useCallback(async () => {
    if (!workerProxy.current) {
      throw new Error("Summarization worker is still loading.");
    }

    await workerProxy.current.preloadModel();
  }, []);

  const summarize = useCallback(
    async (text: string) => {
      if (!workerProxy.current) {
        throw new Error("Summarization worker is still loading.");
      }

      const result = (await workerProxy.current.summarizeText(text)) as
        | SummarizationResult
        | string;

      if (typeof result === "string") {
        const trimmed = result.trim();
        if (trimmed.length === 0) {
          throw new Error("The summarization returned an empty response.");
        }
        return trimmed;
      }

      const summaryText = result
        .map((item) => item.trim() || "")
        .filter((textPart) => textPart.length > 0)
        .join("\n\n")
        .trim();

      if (!summaryText) {
        throw new Error("The summarization returned an empty response.");
      }

      return summaryText;
    },
    [workerProxy],
  );

  return { summarize, isReady, preloadModel, modelDownloadState };
}
