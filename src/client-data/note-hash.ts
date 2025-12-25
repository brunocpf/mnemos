import { z } from "zod";

export const noteHashSchema = z.object({
  noteId: z.uuid(),
  lastIndexedHash: z.string().optional(),
  lastEmbeddedHash: z.string().optional(),
  lastEmbeddingModelId: z.string().optional(),
  indexedAt: z.date().optional(),
  embeddedAt: z.date().optional(),
});

export type NoteHash = z.infer<typeof noteHashSchema>;
