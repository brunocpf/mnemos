import { Chunk } from "@/client-data/chunk";
import { db } from "@/client-data/db";
import { EmbedderService } from "@/services/embedder-service";

const currentModelId =
  process.env.NEXT_PUBLIC_CURRENT_EMBEDDING_MODEL_ID || "Supabase/gte-small";

const pendingEmbedHashByNote = new Map<
  string,
  { version: number; contentHash: string }
>();

const embedder = new EmbedderService({
  modelId: currentModelId,
  callbacks: {
    onChunksResult: async ({ noteId, vectors, version }) => {
      await db.transaction("rw", db.embeddings, db.noteHashes, async () => {
        const pending = pendingEmbedHashByNote.get(noteId);
        if (!pending || pending.version !== version) return;

        const { contentHash } = pending;

        await db.embeddings.bulkPut(
          vectors.map((v) => ({
            chunkId: v.chunkId,
            noteId: noteId,
            modelId: currentModelId,
            vectorBuffer: v.vectorBuffer,
            createdAt: new Date(),
          })),
        );

        await db.noteHashes.put({
          noteId,
          lastEmbeddingModelId: currentModelId,
          lastEmbeddedHash: contentHash,
          embeddedAt: new Date(),
        });
      });
    },
    onError: ({ message }) => {
      console.error("Embedder worker error:", message);
    },
  },
});

function embedChunks(noteId: string, items: Chunk[], contentHash: string) {
  //TODO: use server function/API as fallback
  const version = embedder.embedChunks(
    noteId,
    items.map((c) => ({
      chunkId: c.id,
      text: c.text,
    })),
  );

  pendingEmbedHashByNote.set(noteId, { version, contentHash });
}

export async function persistAndEmbedChunks(
  noteId: string,
  chunks: Chunk[],
  contentHash: string,
) {
  const noteHash = await db.noteHashes.get(noteId);

  const upToDateChunks = noteHash?.lastIndexedHash === contentHash;

  const upToDateEmbeddings =
    noteHash?.lastEmbeddedHash === contentHash &&
    noteHash?.lastEmbeddingModelId === currentModelId;

  if (upToDateChunks && upToDateEmbeddings) return;

  const prev = await db.chunks.where("noteId").equals(noteId).toArray();

  const prevById = new Map(prev.map((c) => [c.id, c]));
  const nextIds = new Set(chunks.map((c) => c.id));

  const removedIds = prev.filter((c) => !nextIds.has(c.id)).map((c) => c.id);

  const addedOrChanged = chunks.filter((c) => {
    const p = prevById.get(c.id);
    return !p || p.hash !== c.hash;
  });

  await db.transaction(
    "rw",
    db.chunks,
    db.embeddings,
    db.noteHashes,
    async () => {
      if (removedIds.length) {
        await db.chunks.bulkDelete(removedIds);

        await db.embeddings.bulkDelete(
          removedIds.map((chunkId) => [chunkId, currentModelId] as const),
        );
      }

      await db.chunks.bulkPut(chunks);

      await db.noteHashes.put({
        noteId,
        lastIndexedHash: contentHash,
        indexedAt: new Date(),
      });
    },
  );

  if (addedOrChanged.length) {
    embedChunks(noteId, addedOrChanged, contentHash);
  }
}
