import {
  AllTasks,
  PipelineType,
  PretrainedModelOptions,
  pipeline,
} from "@huggingface/transformers";

import {
  installResumableDownloads,
  pruneResumableDownloads,
} from "@/lib/resumable-download";

export type FileDownloadState = {
  status: "initiate" | "download" | "progress" | "done";
  loaded?: number;
  total?: number;
  progress?: number;
};

export type ModelDownloadState = {
  isReady: boolean;
  /** Set when loading the pipeline failed; cleared by retry(). */
  error?: string;
  /** Set when download progress cannot be saved, so an interruption restarts the file. */
  storageIssue?: "quota" | "unavailable";
  fileStates: { [fileName: string]: FileDownloadState };
};

export class HfModelWorkerService<T extends PipelineType> {
  protected pipelinePromise?: Promise<AllTasks[T]>;
  protected modelId: string;
  protected pipelineOptions: PretrainedModelOptions;
  protected pipelineType: T;
  protected modelDownloadState: ModelDownloadState;

  protected downloadStateSubscribers: Map<
    number,
    (state: ModelDownloadState) => void
  >;
  protected nextDownloadStateSubscriptionId: number;
  protected storageIssue?: ModelDownloadState["storageIssue"];

  constructor(
    modelId: string,
    pipelineType: T,
    pipelineOptions: PretrainedModelOptions = {},
  ) {
    this.modelId = modelId;
    this.pipelineOptions = pipelineOptions;
    this.pipelineType = pipelineType;

    this.modelDownloadState = {
      isReady: false,
      fileStates: {},
    };

    this.downloadStateSubscribers = new Map();
    this.nextDownloadStateSubscriptionId = 1;

    installResumableDownloads({
      onStorageIssue: (issue) => {
        this.storageIssue = issue;
        this.notifySubscribers();
      },
    });
  }

  init() {
    if (!!this.pipelinePromise) {
      return;
    }

    this.pipelinePromise = pipeline<T>(this.pipelineType, this.modelId, {
      ...this.pipelineOptions,
      progress_callback: (progress) => {
        switch (progress.status) {
          case "initiate": {
            this.modelDownloadState = {
              isReady: false,
              fileStates: {
                ...this.modelDownloadState.fileStates,
                [progress.file]: {
                  status: "initiate",
                },
              },
            };
            break;
          }
          case "download": {
            this.modelDownloadState = {
              isReady: false,
              fileStates: {
                ...this.modelDownloadState.fileStates,
                [progress.file]: {
                  status: "download",
                },
              },
            };
            break;
          }
          case "progress": {
            this.modelDownloadState = {
              isReady: false,
              fileStates: {
                ...this.modelDownloadState.fileStates,
                [progress.file]: {
                  status: "progress",
                  loaded: progress.loaded,
                  total: progress.total,
                  progress: progress.progress,
                },
              },
            };

            break;
          }
          case "done": {
            this.modelDownloadState = {
              isReady: false,
              fileStates: {
                ...this.modelDownloadState.fileStates,
                [progress.file]: {
                  status: "done",
                  loaded:
                    this.modelDownloadState.fileStates[progress.file]?.total,
                  total:
                    this.modelDownloadState.fileStates[progress.file]?.total,
                  progress: 100,
                },
              },
            };

            break;
          }
          case "ready": {
            this.modelDownloadState = {
              isReady: true,
              fileStates: this.modelDownloadState.fileStates,
            };
            break;
          }
        }

        this.notifySubscribers();
      },
    });

    const promise = this.pipelinePromise;
    promise.then(
      () => void pruneResumableDownloads(),
      (error: unknown) => {
        console.error("Model load failed:", error);
        // Drop the rejected promise so a retry can start a fresh load.
        if (this.pipelinePromise === promise) {
          this.pipelinePromise = undefined;
        }
        this.modelDownloadState = {
          isReady: false,
          error: error instanceof Error ? error.message : String(error),
          fileStates: this.modelDownloadState.fileStates,
        };
        this.notifySubscribers();
      },
    );
  }

  /** Returns the pipeline, starting a load unless the last one failed (see retry()). */
  protected async ensurePipeline() {
    if (!this.pipelinePromise) {
      if (this.modelDownloadState.error) {
        throw new Error(this.modelDownloadState.error);
      }
      this.init();
    }
    return this.pipelinePromise!;
  }

  /** Clears a recorded load failure and starts loading the model again. */
  retry() {
    if (this.pipelinePromise) return;
    this.modelDownloadState = { isReady: false, fileStates: {} };
    this.notifySubscribers();
    this.init();
  }

  subscribeDownloadState(callback: (state: ModelDownloadState) => void) {
    const subscriptionId = this.nextDownloadStateSubscriptionId++;
    this.downloadStateSubscribers.set(subscriptionId, callback);

    callback(this.getModelDownloadStateSnapshot());

    return subscriptionId;
  }

  unsubscribeDownloadState(subscriptionId: number) {
    this.downloadStateSubscribers.delete(subscriptionId);
  }

  notifySubscribers() {
    const snapshot = this.getModelDownloadStateSnapshot();

    for (const callback of this.downloadStateSubscribers.values()) {
      callback(snapshot);
    }
  }

  protected getModelDownloadStateSnapshot() {
    return structuredClone({
      ...this.modelDownloadState,
      storageIssue: this.storageIssue,
    });
  }
}
