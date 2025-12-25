import { z } from "zod";

export const localEmbeddingErrorSchema = z.object({
  id: z.uuid(),
  message: z.string(),
  timestamp: z.date(),
});

export type LocalEmbeddingError = z.infer<typeof localEmbeddingErrorSchema>;
