"use server";

import { pipeline } from "@huggingface/transformers";

const modelId =
  process.env.NEXT_PUBLIC_EMBEDDING_MODEL_ID || "Supabase/gte-small";

export async function embed(
  chunks: {
    chunkId: string;
    text: string;
  }[],
) {
  const extractor = await pipeline("feature-extraction", modelId, {
    dtype: "fp32",
  });

  const vectors: { chunkId: string; vectorArray: number[] }[] =
    await Promise.all(
      chunks.map(async (item) => {
        const tensor = await extractor(item.text, {
          pooling: "mean",
          normalize: true,
        });

        const data = Array.from(tensor.data);

        return {
          chunkId: item.chunkId,
          vectorArray: data,
        };
      }),
    );
  return vectors;
}

export async function embedQuery(text: string) {
  const extractor = await pipeline("feature-extraction", modelId, {
    dtype: "fp32",
  });

  const tensor = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });

  const data = Array.from(tensor.data);

  return data;
}
