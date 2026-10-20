import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import type { RuntimeCaching } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Model files are large and already persisted by transformers.js in its own
// Cache API store. Letting the default runtime rules touch them would copy them
// a second time (and evict them after an hour).
const MODEL_HOSTS = /^https:\/\/(?:[\w-]+\.)*(?:huggingface\.co|hf\.co)\//i;

// `/note?new=<timestamp>` opens an empty editor, which is exactly the precached
// `/note` document. Serve that when the network is down. Requests with a
// `noteId` are deliberately excluded: the shell would show an empty editor
// instead of the note.
const NEW_NOTE_PATH = /^(?:\/pt-BR)?\/note$/;

const newNoteOffline: RuntimeCaching = {
  matcher: ({ request, url }) =>
    request.mode === "navigate" &&
    NEW_NOTE_PATH.test(url.pathname) &&
    url.searchParams.has("new") &&
    !url.searchParams.has("noteId"),
  handler: async ({ request, url }) => {
    try {
      return await fetch(request);
    } catch {
      const cached = await serwist.matchPrecache(url.pathname);
      if (cached) return cached;
      throw new Error("No cached new-note shell");
    }
  },
};

// The Share Target opens `/share?title=&text=&url=`. The precached `/share`
// shell reads those params on the client and saves the note locally, so it is
// served as-is when the network is down (precache lookups don't match on the
// query string).
const SHARE_PATH = /^(?:\/pt-BR)?\/share$/;

const shareTargetOffline: RuntimeCaching = {
  matcher: ({ request, url }) =>
    request.mode === "navigate" && SHARE_PATH.test(url.pathname),
  handler: async ({ request, url }) => {
    try {
      return await fetch(request);
    } catch {
      const cached = await serwist.matchPrecache(url.pathname);
      if (cached) return cached;
      throw new Error("No cached share shell");
    }
  },
};

// `/folders/<id>` is rendered per request, so only a placeholder folder is
// precached. The page reads the real id from the URL on the client and loads
// the folder from IndexedDB, so that one shell serves every folder offline.
const FOLDER_PATH = /^(\/pt-BR)?\/folders\/[^/]+$/;

const folderOffline: RuntimeCaching = {
  matcher: ({ request, url }) =>
    request.mode === "navigate" && FOLDER_PATH.test(url.pathname),
  handler: async ({ request, url }) => {
    try {
      return await fetch(request);
    } catch {
      const prefix = url.pathname.startsWith("/pt-BR/") ? "/pt-BR" : "";
      const cached = await serwist.matchPrecache(`${prefix}/folders/_`);
      if (cached) return cached;
      throw new Error("No cached folder shell");
    }
  },
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Updates wait until the user accepts the reload prompt (SwUpdatePrompt).
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    newNoteOffline,
    shareTargetOffline,
    folderOffline,
    { matcher: MODEL_HOSTS, handler: new NetworkOnly() },
    ...defaultCache,
  ],
  fallbacks: {
    // One document for every locale: the page picks its language on the client
    // (see OfflineMessage), so it doesn't matter which locale was negotiated
    // when it was precached.
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
