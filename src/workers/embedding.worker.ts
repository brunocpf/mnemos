/// <reference lib="webworker" />
import { FeatureExtractionPipeline, pipeline } from "@huggingface/transformers";

type EmbedChunksRequest = {
  type: "EMBED_CHUNKS";
  noteId: string;
  version: number;
  modelId: string;
  items: { chunkId: string; text: string }[];
};

type EmbedQueryRequest = {
  type: "EMBED_QUERY";
  version: number;
  modelId: string;
  text: string;
};

type EmbedRequest = EmbedChunksRequest | EmbedQueryRequest;

export type EmbedChunksResponse = {
  type: "CHUNKS_RESULT";
  noteId: string;
  version: number;
  vectors: { chunkId: string; vectorBuffer: ArrayBuffer }[];
};

export type EmbedQueryResponse = {
  type: "QUERY_RESULT";
  version: number;
  vectorBuffer: ArrayBuffer;
};

export type EmbedErrorResponse = {
  type: "ERROR";
  message: string;
};

export type EmbedResponse =
  | EmbedChunksResponse
  | EmbedQueryResponse
  | EmbedErrorResponse;

const latestByNote = new Map<string, number>();
let latestQueryVersion = 0;

self.onmessage = async (ev: MessageEvent<EmbedRequest>) => {
  const msg = ev.data;

  try {
    if (msg.type === "EMBED_CHUNKS") {
      latestByNote.set(msg.noteId, msg.version);

      const extractor = await EmbeddingPipeline.getInstance(msg.modelId);

      const vectors: { chunkId: string; vectorBuffer: ArrayBuffer }[] = [];

      for (let i = 0; i < msg.items.length; i++) {
        if (latestByNote.get(msg.noteId) !== msg.version) return;

        const item = msg.items[i];
        const tensor = await extractor(item.text, {
          pooling: "mean",
          normalize: true,
        });

        const data = Float32Array.from(tensor.data);

        vectors.push({
          chunkId: item.chunkId,
          vectorBuffer: data.buffer,
        });
      }

      if (latestByNote.get(msg.noteId) !== msg.version) return;

      postMessage(
        {
          type: "CHUNKS_RESULT",
          noteId: msg.noteId,
          version: msg.version,
          vectors,
        },
        vectors.map((v) => v.vectorBuffer),
      );

      return;
    }

    if (msg.type === "EMBED_QUERY") {
      latestQueryVersion = msg.version;

      const extractor = await EmbeddingPipeline.getInstance(msg.modelId);

      if (latestQueryVersion !== msg.version) return;

      const tensor = await extractor(msg.text, {
        pooling: "mean",
        normalize: true,
      });

      if (latestQueryVersion !== msg.version) return;

      const data = Float32Array.from(tensor.data);

      postMessage(
        {
          type: "QUERY_RESULT",
          version: msg.version,
          vectorBuffer: data.buffer,
        },
        [data.buffer],
      );

      return;
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      postMessage({ type: "ERROR", message: e.message });
    } else {
      postMessage({
        type: "ERROR",
        message: "Unknown error in embedding worker",
      });
      console.error("Unknown error in embedding worker:", e);
    }
  }
};

class EmbeddingPipeline {
  static instance: FeatureExtractionPipeline | null = null;
  static modelId: string | null = null;

  static async getInstance(modelId: string) {
    if (!EmbeddingPipeline.instance || EmbeddingPipeline.modelId !== modelId) {
      await EmbeddingPipeline.instance?.dispose();

      EmbeddingPipeline.instance = await pipeline<"feature-extraction">(
        "feature-extraction",
        modelId,
      );
      EmbeddingPipeline.modelId = modelId;
    }
    return EmbeddingPipeline.instance;
  }
}
