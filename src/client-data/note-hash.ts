import z from "zod";

export const noteHashSchema = z.object({
  noteId: z.uuid(),
  lastIndexedHash: z.string().nullable(),
  indexedAt: z.date().nullable(),
});

export type NoteHash = z.infer<typeof noteHashSchema>;
