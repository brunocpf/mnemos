import Dexie, { type Table } from "dexie";

/**
 * Persistent storage for partially downloaded model files. A file is split
 * into fixed-size chunks that are written one by one, so an interrupted
 * download can continue from the last stored chunk.
 */
export type DownloadMeta = {
  id: string;
  url: string;
  total: number;
  etag: string | null;
  chunkSize: number;
  chunks: number;
  /** Number of leading chunks that are fully stored. */
  stored: number;
  complete: boolean;
  updatedAt: number;
};

export interface ChunkStore {
  getMeta(id: string): Promise<DownloadMeta | undefined>;
  setMeta(meta: DownloadMeta): Promise<void>;
  putChunk(id: string, index: number, data: Uint8Array): Promise<void>;
  getChunk(id: string, index: number): Promise<Uint8Array | undefined>;
  /** Removes the metadata and every chunk of one download. */
  remove(id: string): Promise<void>;
  list(): Promise<DownloadMeta[]>;
}

export function isQuotaError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "QuotaExceededError" ||
      /quota|no space|disk full/i.test(error.message))
  );
}

export function createMemoryStore(): ChunkStore {
  const metas = new Map<string, DownloadMeta>();
  const chunks = new Map<string, Uint8Array>();
  return {
    async getMeta(id) {
      return metas.get(id);
    },
    async setMeta(meta) {
      metas.set(meta.id, { ...meta });
    },
    async putChunk(id, index, data) {
      chunks.set(`${id}:${index}`, data);
    },
    async getChunk(id, index) {
      return chunks.get(`${id}:${index}`);
    },
    async remove(id) {
      metas.delete(id);
      for (const key of [...chunks.keys()]) {
        if (key.startsWith(`${id}:`)) chunks.delete(key);
      }
    },
    async list() {
      return [...metas.values()];
    },
  };
}

const OPFS_DIR = "mnemos-model-downloads";

async function opfsDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle(OPFS_DIR, { create: true });
}

async function writeFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: BufferSource | string,
) {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(data);
  } catch (error) {
    await writable.abort().catch(() => undefined);
    throw error;
  }
  await writable.close();
}

async function readFile(dir: FileSystemDirectoryHandle, name: string) {
  try {
    const handle = await dir.getFileHandle(name);
    return await (await handle.getFile()).arrayBuffer();
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return undefined;
    }
    throw error;
  }
}

/** Origin private file system: one directory per download, one file per chunk. */
export function createOpfsStore(): ChunkStore {
  const download = async (id: string, create: boolean) => {
    const dir = await opfsDir();
    return await dir.getDirectoryHandle(id, { create }).catch(() => undefined);
  };

  return {
    async getMeta(id) {
      const dir = await download(id, false);
      if (!dir) return undefined;
      const raw = await readFile(dir, "meta.json");
      return raw
        ? (JSON.parse(new TextDecoder().decode(raw)) as DownloadMeta)
        : undefined;
    },
    async setMeta(meta) {
      const dir = await download(meta.id, true);
      await writeFile(dir!, "meta.json", JSON.stringify(meta));
    },
    async putChunk(id, index, data) {
      const dir = await download(id, true);
      await writeFile(dir!, `c${index}`, data as Uint8Array<ArrayBuffer>);
    },
    async getChunk(id, index) {
      const dir = await download(id, false);
      if (!dir) return undefined;
      const raw = await readFile(dir, `c${index}`);
      return raw ? new Uint8Array(raw) : undefined;
    },
    async remove(id) {
      const dir = await opfsDir();
      await dir.removeEntry(id, { recursive: true }).catch(() => undefined);
    },
    async list() {
      const dir = await opfsDir();
      const metas: DownloadMeta[] = [];
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind !== "directory") continue;
        const meta = await this.getMeta(name);
        if (meta) metas.push(meta);
      }
      return metas;
    },
  };
}

class DownloadsDb extends Dexie {
  meta!: Table<DownloadMeta, string>;
  chunks!: Table<{ key: string; id: string; data: Uint8Array }, string>;

  constructor() {
    super("mnemos-model-downloads");
    this.version(1).stores({ meta: "id", chunks: "key, id" });
  }
}

/** IndexedDB fallback for browsers without a writable OPFS. */
export function createIdbStore(): ChunkStore {
  const db = new DownloadsDb();
  return {
    getMeta: (id) => db.meta.get(id),
    async setMeta(meta) {
      await db.meta.put(meta);
    },
    async putChunk(id, index, data) {
      await db.chunks.put({ key: `${id}:${index}`, id, data });
    },
    async getChunk(id, index) {
      return (await db.chunks.get(`${id}:${index}`))?.data;
    },
    async remove(id) {
      await db.chunks.where("id").equals(id).delete();
      await db.meta.delete(id);
    },
    list: () => db.meta.toArray(),
  };
}

async function opfsWorks() {
  try {
    const dir = await opfsDir();
    await writeFile(dir, ".probe", "ok");
    await dir.removeEntry(".probe");
    return true;
  } catch {
    return false;
  }
}

/** OPFS when it can be written to, IndexedDB otherwise. Decided on first use. */
export function createAutoStore(): ChunkStore {
  let chosen: Promise<ChunkStore> | undefined;
  const pick = () =>
    (chosen ??= opfsWorks().then((ok) =>
      ok ? createOpfsStore() : createIdbStore(),
    ));
  return {
    getMeta: async (id) => (await pick()).getMeta(id),
    setMeta: async (meta) => (await pick()).setMeta(meta),
    putChunk: async (id, i, data) => (await pick()).putChunk(id, i, data),
    getChunk: async (id, i) => (await pick()).getChunk(id, i),
    remove: async (id) => (await pick()).remove(id),
    list: async () => (await pick()).list(),
  };
}
