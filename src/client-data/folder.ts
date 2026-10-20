import { z } from "zod";

export const FOLDER_NAME_MAX_LENGTH = 100;

export const folderNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(FOLDER_NAME_MAX_LENGTH);

export const folderSchema = z.object({
  id: z.uuid(),
  name: folderNameSchema,
  /** `null` is a top-level folder (its parent is the root). */
  parentId: z.uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Folder = z.infer<typeof folderSchema>;
