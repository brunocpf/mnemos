import { dotProduct } from "@/lib/dot-product";
import { topKPush } from "@/lib/top-k-push";

export type RankedChunk = { noteId: string; chunkId: string; score: number };

/**
 * Scores stored embeddings against a query vector and returns the best chunk
 * per note, highest score first. Rows with empty/mismatched vectors are skipped.
 */
export function rankEmbeddings(
  queryVector: Float32Array,
  embeddings: Iterable<{
    noteId: string;
    chunkId: string;
    vectorBuffer?: ArrayBuffer;
  }>,
  topK: number,
  oversamplingFactor = 2,
  isNoteAllowed?: (noteId: string) => boolean,
): RankedChunk[] {
  if (queryVector.length === 0 || topK <= 0) return [];
  const candidates: RankedChunk[] = [];
  const limit = topK * Math.max(1, oversamplingFactor);

  for (const embedding of embeddings) {
    const { vectorBuffer } = embedding;
    if (!vectorBuffer || vectorBuffer.byteLength === 0) continue;
    if (isNoteAllowed && !isNoteAllowed(embedding.noteId)) continue;
    const chunkVector = new Float32Array(vectorBuffer);
    if (chunkVector.length !== queryVector.length) continue;
    const score = dotProduct(queryVector, chunkVector);
    if (!Number.isFinite(score)) continue;
    topKPush(
      candidates,
      { noteId: embedding.noteId, chunkId: embedding.chunkId, score },
      limit,
    );
  }

  const bestByNote = new Map<string, RankedChunk>();
  for (const c of candidates) {
    const prev = bestByNote.get(c.noteId);
    if (!prev || c.score > prev.score) bestByNote.set(c.noteId, c);
  }
  return Array.from(bestByNote.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
