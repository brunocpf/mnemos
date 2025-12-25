"use server";

import { pipeline } from "@huggingface/transformers";

const modelId =
  process.env.NEXT_PUBLIC_CURRENT_EMBEDDING_MODEL_ID ||
  "sentence-transformers/all-MiniLM-L6-v2";

export async function embed(
  chunks: {
    chunkId: string;
    text: string;
  }[],
) {
  const extractor = await pipeline("feature-extraction", modelId, {
    dtype: "auto",
  });

  const vectors: { chunkId: string; vectorBuffer: ArrayBuffer }[] =
    await Promise.all(
      chunks.map(async (item) => {
        const tensor = await extractor(item.text, {
          pooling: "mean",
          normalize: true,
        });

        const data = Float32Array.from(tensor.data);

        return {
          chunkId: item.chunkId,
          vectorBuffer: data.buffer,
        };
      }),
    );
  return vectors;
}

export async function embedQuery(text: string) {
  const extractor = await pipeline("feature-extraction", modelId, {
    dtype: "auto",
  });

  const tensor = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });

  const data = Float32Array.from(tensor.data);

  return data;
}
