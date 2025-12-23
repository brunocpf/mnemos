import z from "zod";

export const embeddingSchema = z.object({
  chunkId: z.string(),
  modelId: z.string(),
  dims: z.number().array(),
  vector: z.number().array(),
});

export type Embedding = z.infer<typeof embeddingSchema>;
