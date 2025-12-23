import { Chunk } from "@/client-data/chunk";
import { db } from "@/client-data/db";

export async function indexChunks(
  noteId: string,
  chunks: Chunk[],
  contentHash: string,
) {
  const noteHash = await db.noteHashes.get(noteId);

  if (noteHash?.lastIndexedHash === contentHash) {
    return;
  }

  const prev = await db.chunks.where("noteId").equals(noteId).toArray();
  const nextIds = new Set(chunks.map((c) => c.id));

  const removedIds = prev.filter((c) => !nextIds.has(c.id)).map((c) => c.id);

  // These will be used later to schedule embeddings
  //   const addedOrChanged = chunks.filter((c) => {
  //     const p = prev.find((x) => x.id === c.id);
  //     return !p || p.hash !== c.hash;
  //   });

  await db.transaction(
    "rw",
    db.chunks,
    db.embeddings,
    db.noteHashes,
    async () => {
      if (removedIds.length) {
        await db.chunks.bulkDelete(removedIds);
        await db.embeddings.where("chunkId").anyOf(removedIds).delete();
      }

      await db.chunks.bulkPut(chunks);

      await db.noteHashes.put({
        noteId,
        lastIndexedHash: contentHash,
        indexedAt: new Date(),
      });
    },
  );

  // TODO: schedule embedding for added/changed chunks
  // embedWorker.enqueue(addedOrChanged.map(c => ({ chunkId: c.id, text: c.text })))
}
