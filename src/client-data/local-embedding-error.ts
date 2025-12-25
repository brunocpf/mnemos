import { z } from "zod";

export const localEmbeddingErrorSchema = z.object({
  id: z.uuid(),
  message: z.string(),
  type: z.enum(["EMBED_QUERY", "EMBED_CHUNKS"]),
  timestamp: z.date(),
});

export type LocalEmbeddingError = z.infer<typeof localEmbeddingErrorSchema>;
