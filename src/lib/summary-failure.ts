import type { ModelDownloadState } from "@/lib/hf-model-worker-service";

export type SummaryFailureReason =
  | { kind: "downloading"; progress: number | undefined }
  | { kind: "offline" }
  | { kind: "modelFailed"; detail?: string }
  | { kind: "failed" };

/** Overall download progress (0-100) across files, if any file reports it. */
export function getDownloadProgress(state?: ModelDownloadState) {
  const files = Object.values(state?.fileStates ?? {});
  const total = files.reduce((sum, f) => sum + (f.total ?? 0), 0);
  if (total > 0) {
    const loaded = files.reduce((sum, f) => sum + (f.loaded ?? 0), 0);
    return Math.min(100, Math.floor((loaded / total) * 100));
  }
  return undefined;
}

/**
 * Explains why a summary could not be produced so the UI can offer the
 * matching action instead of a generic error.
 */
export function getSummaryFailureReason({
  host,
  modelDownloadState,
  online,
}: {
  host: "local-only" | "server-only" | "allow-fallback";
  modelDownloadState?: ModelDownloadState;
  online: boolean;
}): SummaryFailureReason {
  // With the cloud as a working fallback, a summary failure isn't the model's fault.
  if (
    modelDownloadState?.error &&
    (host === "local-only" || (host === "allow-fallback" && !online))
  ) {
    return { kind: "modelFailed", detail: modelDownloadState.error };
  }

  const localModelPending =
    host !== "server-only" &&
    !!modelDownloadState &&
    !modelDownloadState.isReady &&
    !modelDownloadState.error &&
    Object.values(modelDownloadState.fileStates).some(
      (f) => f.status !== "done",
    );

  if (localModelPending) {
    return {
      kind: "downloading",
      progress: getDownloadProgress(modelDownloadState),
    };
  }
  if (!online) return { kind: "offline" };
  return { kind: "failed" };
}
