import * as Comlink from "comlink";
import { useCallback, useEffect, useRef } from "react";

import type {
  SummarizationResult,
  SummarizationService,
} from "@/workers/summarization.worker";

export function useSummarizationWorker() {
  const workerProxy = useRef<Comlink.Remote<SummarizationService>>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return;
    }

    const worker = new Worker(
      new URL("@/workers/summarization.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerProxy.current = Comlink.wrap(worker);

    return () => worker.terminate();
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

  return { summarize, isReady: workerProxy !== null };
}
