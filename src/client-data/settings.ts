import { z } from "zod";

export const settingsSchema = z.object({
  embeddingHost: z.enum(["local-only", "allow-fallback"]).default("local-only"),
  dismissEmbeddingErrorMessages: z.boolean().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;
