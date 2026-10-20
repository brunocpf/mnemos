/// <reference lib="webworker" />
import { expose } from "comlink";

import { buildEmbeddingBody } from "@/lib/build-embedding-body";
import { getMarkdownBlocks } from "@/lib/get-markdown-blocks";
import { mergeBlocksIntoChunks } from "@/lib/merge-blocks-into-chunks";
import { sha256 } from "@/lib/sha256";

class ChunkingWorkerService {
  async chunkNote(request: {
    noteId: string;
    version: number;
    title?: string;
    content: string;
    settings: {
      targetChars: number;
      maxChars: number;
    };
  }) {
    const body = buildEmbeddingBody(request.title, request.content);

    const blocks = getMarkdownBlocks(body);
    const mergedChunks = mergeBlocksIntoChunks(
      blocks,
      request.settings.targetChars,
      request.settings.maxChars,
    );
    const contentHash = await sha256(body);

    const chunks = await Promise.all(
      mergedChunks.map(async (chunk, index) => {
        const chunkHash = await sha256(chunk);
        const chunkId = `${request.noteId}:${chunkHash.slice(0, 12)}`;
        return {
          id: chunkId,
          noteId: request.noteId,
          order: index,
          text: chunk,
          hash: chunkHash,
        };
      }),
    );

    return {
      noteId: request.noteId,
      version: request.version,
      chunks,
      contentHash,
    };
  }
}

export type ChunkingWorkerApi = ChunkingWorkerService;

expose(new ChunkingWorkerService());
