import { z } from "zod";

export const embeddingJobStatusSchema = z.enum([
  "pending",
  "in_progress",
  "done",
  "failed",
]);

export const embeddingJobSchema = z.object({
  id: z.string(),
  noteId: z.string(),
  chunkId: z.string(),
  modelId: z.string(),
  /** Note-level content hash this job was enqueued for. */
  contentHash: z.string(),
  text: z.string(),
  status: embeddingJobStatusSchema,
  createdAt: z.date(),
  attempts: z.number().min(0),
  lastError: z.string().optional(),
});

export type EmbeddingJob = z.infer<typeof embeddingJobSchema>;
export type EmbeddingJobStatus = z.infer<typeof embeddingJobStatusSchema>;
