import { z } from "zod";

export const settingsSchema = z.object({
  summarizerHost: z
    .enum(["local-only", "allow-fallback", "server-only"])
    .default("allow-fallback"),
  embeddingHost: z.enum(["local-only", "allow-fallback"]).default("local-only"),
  dismissEmbeddingErrorMessages: z.boolean().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;
