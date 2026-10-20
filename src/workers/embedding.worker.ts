/// <reference lib="webworker" />
import { expose } from "comlink";

import {
  EMBEDDING_DOCUMENT_PREFIX,
  EMBEDDING_DTYPE,
  EMBEDDING_MODEL_ID,
  EMBEDDING_QUERY_PREFIX,
} from "@/lib/embedding-config";
import { HfModelWorkerService } from "@/lib/hf-model-worker-service";

const modelId = EMBEDDING_MODEL_ID;

class EmbeddingWorkerService extends HfModelWorkerService<"feature-extraction"> {
  private latestByNote = new Map<string, number>();
  private latestQueryVersion = 0;

  constructor() {
    super(modelId, "feature-extraction", {
      device: "gpu" in navigator ? "webgpu" : "wasm",
      dtype: EMBEDDING_DTYPE,
    });
  }

  get model() {
    return this.modelId;
  }

  async embedChunks(request: {
    noteId: string;
    version: number;
    items: { chunkId: string; text: string }[];
  }) {
    this.latestByNote.set(request.noteId, request.version);

    if (!this.pipelinePromise) {
      this.init();
    }

    const extractor = await this.pipelinePromise;

    if (!extractor) {
      throw new Error("Embedding pipeline is not initialized.");
    }

    const vectors: { chunkId: string; vectorBuffer: ArrayBuffer }[] = [];

    for (const item of request.items) {
      if (this.latestByNote.get(request.noteId) !== request.version) {
        return null;
      }

      const tensor = await extractor(EMBEDDING_DOCUMENT_PREFIX + item.text, {
        pooling: "mean",
        normalize: true,
      });

      if (this.latestByNote.get(request.noteId) !== request.version) {
        return null;
      }

      const data = Float32Array.from(tensor.data);
      vectors.push({
        chunkId: item.chunkId,
        vectorBuffer: data.buffer,
      });
    }

    if (this.latestByNote.get(request.noteId) !== request.version) {
      return null;
    }

    return {
      noteId: request.noteId,
      version: request.version,
      vectors,
    };
  }

  async embedQuery(request: { version: number; text: string }) {
    this.latestQueryVersion = request.version;

    if (!this.pipelinePromise) {
      this.init();
    }

    const extractor = await this.pipelinePromise;

    if (!extractor) {
      throw new Error("Embedding pipeline is not initialized.");
    }

    const tensor = await extractor(EMBEDDING_QUERY_PREFIX + request.text, {
      pooling: "mean",
      normalize: true,
    });

    if (this.latestQueryVersion !== request.version) {
      return null;
    }

    const data = Float32Array.from(tensor.data);

    return {
      version: request.version,
      vectorBuffer: data.buffer,
    };
  }
}

export type EmbeddingWorkerApi = EmbeddingWorkerService;

expose(new EmbeddingWorkerService());
