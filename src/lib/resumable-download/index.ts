import { env } from "@huggingface/transformers";

import { createAutoStore, type ChunkStore } from "./chunk-store";
import { createResumableFetch, type StorageIssue } from "./resumable-fetch";

const STALE_PARTIAL_MS = 14 * 24 * 60 * 60 * 1000;

let store: ChunkStore | undefined;

/**
 * Routes transformers.js model downloads through the resumable layer.
 * Safe to call from a worker; later calls only replace the issue callback.
 */
export function installResumableDownloads(options: {
  onStorageIssue?: (issue: StorageIssue) => void;
}) {
  store ??= createAutoStore();
  // Best effort: ask the browser not to evict half-downloaded models.
  void navigator.storage?.persist?.().catch(() => undefined);
  env.fetch = createResumableFetch({
    store,
    onStorageIssue: options.onStorageIssue,
  });
}

/**
 * Once transformers.js holds a model in its own cache the chunk copy is dead
 * weight. Drops completed downloads that are in the Cache API, and partial
 * downloads nobody resumed for two weeks (e.g. after switching models).
 */
export async function pruneResumableDownloads() {
  if (!store) return;
  try {
    const cache =
      typeof caches !== "undefined" ? await caches.open(env.cacheKey) : null;
    for (const meta of await store.list()) {
      const stale = Date.now() - meta.updatedAt > STALE_PARTIAL_MS;
      const cached = meta.complete && !!(await cache?.match(meta.url));
      if (cached || (!meta.complete && stale)) await store.remove(meta.id);
    }
  } catch {
    // Housekeeping only.
  }
}
