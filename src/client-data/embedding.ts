import { z } from "zod";

export const embeddingSchema = z.object({
  chunkId: z.string(),
  noteId: z.string(),
  modelId: z.string(),
  vectorBuffer: z.instanceof(ArrayBuffer),
});

export type Embedding = z.infer<typeof embeddingSchema>;
