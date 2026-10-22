import { z } from "zod";

/**
 * Pure helpers shared by the `embed` / `summarize` server actions.
 * Lives outside the "use server" modules so it can be unit tested.
 */

export const LIMITS = {
  /** Chunks per embed request (the client chunks at <=1200 chars). */
  maxChunks: 64,
  maxCharsPerChunk: 2_000,
  maxQueryChars: 2_000,
  maxSummaryChars: 20_000,
} as const;

export const RATE_LIMITS = {
  embed: { max: 60, windowMs: 60_000 },
  summarize: { max: 10, windowMs: 60_000 },
} as const;

export type ServerErrorCode =
  | "invalid_input"
  | "rate_limited"
  | "not_configured"
  | "upstream_error";

export type ServerError = {
  ok: false;
  code: ServerErrorCode;
  message: string;
  retryAfterSeconds?: number;
};

export type ServerResult<T> = ({ ok: true } & T) | ServerError;

export function serverError(
  code: ServerErrorCode,
  message: string,
  retryAfterSeconds?: number,
): ServerError {
  return { ok: false, code, message, retryAfterSeconds };
}

export const embedChunksSchema = z
  .array(
    z.object({
      chunkId: z.string().min(1).max(200),
      text: z.string().min(1).max(LIMITS.maxCharsPerChunk),
    }),
  )
  .min(1)
  .max(LIMITS.maxChunks);

export const embedQuerySchema = z
  .string()
  .trim()
  .min(1)
  .max(LIMITS.maxQueryChars);

export const summarizeSchema = z
  .string()
  .trim()
  .min(1)
  .max(LIMITS.maxSummaryChars);

export function describeZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue
    ? `${issue.path.join(".") || "input"}: ${issue.message}`
    : "Invalid input.";
}

export function meanPool(tokenEmbeddings: number[][]): number[] {
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

export function l2Normalize(vec: number[]): number[] {
  let sumSq = 0;
  for (const v of vec) sumSq += v * v;
  const norm = Math.sqrt(sumSq);
  if (!Number.isFinite(norm) || norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/**
 * The HF Inference API may return a pooled `number[]` or token-level
 * `number[][]` (mean-pooled here). Output is L2-normalized.
 */
export function coerceVector(output: unknown): number[] {
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

/**
 * Best-effort fixed-window rate limiter. State is per server instance, so on
 * serverless platforms it only limits requests hitting the same warm instance.
 */
export function createRateLimiter(opts: {
  max: number;
  windowMs: number;
  maxKeys?: number;
}) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const maxKeys = opts.maxKeys ?? 5_000;

  return function check(key: string, now = Date.now()) {
    if (hits.size > maxKeys) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      if (hits.size > maxKeys) hits.clear();
    }

    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
      return { allowed: true as const };
    }
    if (entry.count >= opts.max) {
      return {
        allowed: false as const,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      };
    }
    entry.count += 1;
    return { allowed: true as const };
  };
}

export function clientKeyFromHeaders(headers: {
  get(name: string): string | null;
}): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** Unguessable delimiter suffix for prompt-injection fencing. */
export function randomSalt(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
