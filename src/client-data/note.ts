import z from "zod";

export const noteSchema = z.object({
  id: z.uuid(),
  title: z.string().max(100),
  content: z.string(),
  deleted: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export type Note = z.infer<typeof noteSchema>;
