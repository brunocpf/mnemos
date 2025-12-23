/// <reference lib="webworker" />
import { appendTitleToContent } from "@/lib/append-title-to-content";
import { getMarkdownBlocks } from "@/lib/get-markdown-blocks";
import { mergeBlocksIntoChunks } from "@/lib/merge-blocks-into-chunks";
import { sha256 } from "@/lib/sha256";

export type IndexRequest = {
  type: "INDEX_NOTE";
  noteId: string;
  version: number;
  title?: string;
  content: string;
  settings: {
    targetChars: number;
    maxChars: number;
  };
};

export type IndexResponse = {
  type: "INDEX_RESULT";
  noteId: string;
  version: number;
  chunks: {
    id: string;
    noteId: string;
    order: number;
    text: string;
    hash: string;
  }[];
  contentHash: string;
};

self.onmessage = async (ev: MessageEvent<IndexRequest>) => {
  const msg = ev.data;

  if (msg.type !== "INDEX_NOTE") return;

  const body = msg.title
    ? appendTitleToContent(msg.title, msg.content)
    : msg.content;

  const blocks = getMarkdownBlocks(body);
  const mergedChunks = mergeBlocksIntoChunks(
    blocks,
    msg.settings.targetChars,
    msg.settings.maxChars,
  );
  const contentHash = await sha256(msg.content);

  const chunks = await Promise.all(
    mergedChunks.map(async (chunk, index) => {
      const chunkHash = await sha256(chunk);
      const chunkId = `${msg.noteId}:${chunkHash.slice(0, 12)}`;
      return {
        id: chunkId,
        noteId: msg.noteId,
        order: index,
        text: chunk,
        hash: chunkHash,
      };
    }),
  );

  const res: IndexResponse = {
    type: "INDEX_RESULT",
    noteId: msg.noteId,
    version: msg.version,
    chunks,
    contentHash,
  };

  (self as DedicatedWorkerGlobalScope).postMessage(res);
};
