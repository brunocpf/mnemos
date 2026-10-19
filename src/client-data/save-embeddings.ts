import { db } from "@/client-data/db";

/**
 * Persists vectors for a note only if it still exists and is not deleted, and
 * merges the hash record (a plain put would wipe lastIndexedHash).
 * Returns false when the note vanished mid-embed.
 */
export async function saveEmbeddings(args: {
  noteId: string;
  modelId: string;
  contentHash: string;
  vectors: { chunkId: string; vectorBuffer: ArrayBuffer }[];
}) {
  return await db.transaction(
    "rw",
    db.notes,
    db.chunks,
    db.embeddings,
    db.noteHashes,
    async () => {
      const note = await db.notes.get(args.noteId);
      if (!note || note.deleted) return false;
      // Drop vectors for chunks that no longer exist (note edited mid-embed).
      const liveChunkIds = new Set(
        await db.chunks.where("noteId").equals(args.noteId).primaryKeys(),
      );
      const vectors = args.vectors.filter((v) => liveChunkIds.has(v.chunkId));
      await db.embeddings.bulkPut(
        vectors.map((v) => ({
          chunkId: v.chunkId,
          noteId: args.noteId,
          modelId: args.modelId,
          vectorBuffer: v.vectorBuffer,
        })),
      );
      const prev = await db.noteHashes.get(args.noteId);
      await db.noteHashes.put({
        ...prev,
        noteId: args.noteId,
        lastEmbeddingModelId: args.modelId,
        lastEmbeddedHash: args.contentHash,
        embeddedAt: new Date(),
      });
      return true;
    },
  );
}
