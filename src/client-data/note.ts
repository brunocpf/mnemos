import { z } from "zod";

export const noteSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(100).optional(),
  content: z.string(),
  /** `null`/`undefined` means the note lives at the root. */
  folderId: z.uuid().nullable().optional(),
  deleted: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export type Note = z.infer<typeof noteSchema>;
