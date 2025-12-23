import z from "zod";

export const chunkSchema = z.object({
  id: z.uuid(),
  noteId: z.uuid(),
  order: z.number().min(0),
  text: z.string(),
  hash: z.string(),
});

export type Chunk = z.infer<typeof chunkSchema>;
