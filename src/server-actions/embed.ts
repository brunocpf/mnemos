"use server";

import { InferenceClient } from "@huggingface/inference";

const modelId =
  process.env.NEXT_PUBLIC_EMBEDDING_MODEL_ID || "Supabase/gte-small";

function meanPool(tokenEmbeddings: number[][]): number[] {
  if (tokenEmbeddings.length === 0) return [];
  const dims = tokenEmbeddings[0]?.length ?? 0;
  if (dims === 0) return [];

  const sum = new Array<number>(dims).fill(0);
  for (const token of tokenEmbeddings) {
    for (let i = 0; i < dims; i += 1) {
      sum[i] += token[i] ?? 0;
    }
  }
  const inv = 1 / tokenEmbeddings.length;
  for (let i = 0; i < dims; i += 1) sum[i] *= inv;
  return sum;
}

function l2Normalize(vec: number[]): number[] {
  let sumSq = 0;
  for (const v of vec) sumSq += v * v;
  const norm = Math.sqrt(sumSq);
  if (!Number.isFinite(norm) || norm === 0) return vec;
  return vec.map((v) => v / norm);
}

function coerceVector(output: unknown): number[] {
  // The HF Inference API may return:
  // - number[] for a single pooled embedding
  // - number[][] for token embeddings (needs mean pooling)
  // - for batched inputs, a higher-rank nested array handled elsewhere
  if (!Array.isArray(output)) {
    throw new Error("Unexpected embedding output type.");
  }

  if (output.length === 0) return [];

  const first = output[0];
  if (typeof first === "number") {
    return l2Normalize(output as number[]);
  }

  if (Array.isArray(first) && typeof first[0] === "number") {
    return l2Normalize(meanPool(output as number[][]));
  }

  throw new Error("Unexpected embedding output shape.");
}

async function featureExtraction(inputs: string | string[]) {
  const token = process.env.HF_API_TOKEN;
  if (!token) {
    throw new Error("HF_API_TOKEN is not set.");
  }

  const hf = new InferenceClient(token);
  return hf.featureExtraction({
    model: modelId,
    inputs,
  });
}

export async function embed(
  chunks: {
    chunkId: string;
    text: string;
  }[],
) {
  if (chunks.length === 0) return [];

  const inputs = chunks.map((c) => c.text);
  const output = await featureExtraction(inputs);

  if (!Array.isArray(output) || output.length !== chunks.length) {
    // Some models/endpoints may return a single vector even for batched input.
    // Fall back to per-item requests to preserve behavior.
    const vectors = await Promise.all(
      chunks.map(async (item) => {
        const single = await featureExtraction(item.text);
        return {
          chunkId: item.chunkId,
          vectorArray: coerceVector(single),
        };
      }),
    );
    return vectors;
  }

  const vectors: { chunkId: string; vectorArray: number[] }[] = chunks.map(
    (item, idx) => ({
      chunkId: item.chunkId,
      vectorArray: coerceVector((output as unknown[])[idx]),
    }),
  );

  return vectors;
}

export async function embedQuery(text: string) {
  const output = await featureExtraction(text);
  return coerceVector(output);
}
