"use server";

import { InferenceClient } from "@huggingface/inference";
import { headers } from "next/headers";

import {
  EMBEDDING_DOCUMENT_PREFIX,
  EMBEDDING_QUERY_PREFIX,
  SERVER_EMBEDDING_MODEL_ID,
} from "@/lib/embedding-config";
import {
  clientKeyFromHeaders,
  coerceVector,
  createRateLimiter,
  describeZodError,
  embedChunksSchema,
  embedQuerySchema,
  RATE_LIMITS,
  type ServerResult,
  serverError,
} from "@/lib/server-ai";

const checkRate = createRateLimiter(RATE_LIMITS.embed);

async function guard() {
  const token = process.env.HF_API_TOKEN;
  if (!token) {
    return serverError(
      "not_configured",
      "Server-side embeddings are not configured (HF_API_TOKEN is not set).",
    );
  }
  const rate = checkRate(clientKeyFromHeaders(await headers()));
  if (!rate.allowed) {
    return serverError(
      "rate_limited",
      "Too many requests. Try again later.",
      rate.retryAfterSeconds,
    );
  }
  return { token };
}

async function featureExtraction(
  token: string,
  inputs: string | string[],
  prefix: string,
) {
  return new InferenceClient(token).featureExtraction({
    model: SERVER_EMBEDDING_MODEL_ID,
    inputs: Array.isArray(inputs)
      ? inputs.map((t) => prefix + t)
      : prefix + inputs,
  });
}

export async function embed(
  chunks: { chunkId: string; text: string }[],
): Promise<
  ServerResult<{ vectors: { chunkId: string; vectorArray: number[] }[] }>
> {
  const parsed = embedChunksSchema.safeParse(chunks);
  if (!parsed.success) {
    return serverError("invalid_input", describeZodError(parsed.error));
  }
  const g = await guard();
  if ("ok" in g) return g;

  try {
    const items = parsed.data;
    const output = await featureExtraction(
      g.token,
      items.map((c) => c.text),
      EMBEDDING_DOCUMENT_PREFIX,
    );

    // Some models/endpoints return a single vector even for batched input;
    // fall back to per-item requests in that case.
    if (!Array.isArray(output) || output.length !== items.length) {
      const vectors = await Promise.all(
        items.map(async (item) => ({
          chunkId: item.chunkId,
          vectorArray: coerceVector(
            await featureExtraction(
              g.token,
              item.text,
              EMBEDDING_DOCUMENT_PREFIX,
            ),
          ),
        })),
      );
      return { ok: true, vectors };
    }

    return {
      ok: true,
      vectors: items.map((item, idx) => ({
        chunkId: item.chunkId,
        vectorArray: coerceVector((output as unknown[])[idx]),
      })),
    };
  } catch (error) {
    console.error("[embed] upstream failure", error);
    return serverError("upstream_error", "Embedding request failed.");
  }
}

export async function embedQuery(
  text: string,
): Promise<ServerResult<{ vector: number[] }>> {
  const parsed = embedQuerySchema.safeParse(text);
  if (!parsed.success) {
    return serverError("invalid_input", describeZodError(parsed.error));
  }
  const g = await guard();
  if ("ok" in g) return g;

  try {
    const output = await featureExtraction(
      g.token,
      parsed.data,
      EMBEDDING_QUERY_PREFIX,
    );
    return { ok: true, vector: coerceVector(output) };
  } catch (error) {
    console.error("[embedQuery] upstream failure", error);
    return serverError("upstream_error", "Embedding request failed.");
  }
}
