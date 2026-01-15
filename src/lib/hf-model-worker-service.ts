import {
  AllTasks,
  PipelineType,
  PretrainedModelOptions,
  pipeline,
} from "@huggingface/transformers";

export type FileDownloadState = {
  status: "initiate" | "download" | "progress" | "done";
  loaded?: number;
  total?: number;
  progress?: number;
};

export type ModelDownloadState = {
  isReady: boolean;
  fileStates: { [fileName: string]: FileDownloadState };
};

export class HfModelWorkerService<T extends PipelineType> {
  protected pipeline?: AllTasks[T];
  protected modelId: string;
  protected pipelineOptions: PretrainedModelOptions;
  protected pipelineType: T;
  protected modelDownloadState: ModelDownloadState;

  protected downloadStateSubscribers: Map<
    number,
    (state: ModelDownloadState) => void
  >;
  protected nextDownloadStateSubscriptionId: number;

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
  }

  async init() {
    this.pipeline = await pipeline<T>(this.pipelineType, this.modelId, {
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
    return structuredClone(this.modelDownloadState);
  }
}
