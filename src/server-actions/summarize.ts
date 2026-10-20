"use server";

import { createHuggingFace } from "@ai-sdk/huggingface";
import { generateText } from "ai";
import { headers } from "next/headers";

import {
  clientKeyFromHeaders,
  createRateLimiter,
  describeZodError,
  RATE_LIMITS,
  randomSalt,
  type ServerResult,
  serverError,
  summarizeSchema,
} from "@/lib/server-ai";
import { buildSummaryMessages } from "@/lib/summary-prompt";

const checkRate = createRateLimiter(RATE_LIMITS.summarize);

export async function summarize(
  text: string,
): Promise<ServerResult<{ result: string }>> {
  const parsed = summarizeSchema.safeParse(text);
  if (!parsed.success) {
    return serverError("invalid_input", describeZodError(parsed.error));
  }

  const apiKey = process.env.HF_API_TOKEN;
  if (!apiKey) {
    return serverError(
      "not_configured",
      "Server-side summarization is not configured (HF_API_TOKEN is not set).",
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

  const [system, user] = buildSummaryMessages(parsed.data, randomSalt());

  try {
    const model = createHuggingFace({ apiKey })(
      process.env.SERVER_SUMMARIZER_MODEL ?? "Qwen/Qwen3-30B-A3B-Instruct-2507",
    );
    const { text: summary } = await generateText({
      model,
      system: system.content,
      messages: [user],
    });
    return { ok: true, result: summary };
  } catch (error) {
    console.error("[summarize] upstream failure", error);
    return serverError("upstream_error", "Summarization request failed.");
  }
}
