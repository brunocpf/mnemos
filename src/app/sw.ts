import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import type { RuntimeCaching, SerwistPlugin } from "serwist";
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
} from "serwist";

import { getOfflineShellPath } from "@/lib/offline-shell";

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

// transformers.js loads the onnxruntime-web wasm and its loader from jsDelivr.
// defaultCache only keeps cross-origin files for about an hour, after which
// on-device embeddings and summaries would fail offline. The URLs are
// versioned, so cache them for a long time and serve cache-first.
const ONNX_RUNTIME_FILES =
  /^\/npm\/onnxruntime-web@[^/]+\/dist\/[^/]+\.(?:wasm|mjs)$/;

const onnxRuntime: RuntimeCaching = {
  matcher: ({ url }) =>
    url.hostname === "cdn.jsdelivr.net" &&
    ONNX_RUNTIME_FILES.test(url.pathname),
  handler: new CacheFirst({
    cacheName: "onnxruntime-wasm",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 16,
        maxAgeSeconds: 365 * 24 * 60 * 60,
        maxAgeFrom: "last-used",
      }),
    ],
  }),
};

// Every app route is rendered per request (the shared layout reads search
// params), so only one shell per route and locale is precached. The pages read
// their dynamic parts (noteId, folder id, share payload) from the URL on the
// client and load the data from IndexedDB, so that shell serves every note,
// folder and query string when the network is down. Online, the server's
// document wins; offline (or after NAVIGATION_TIMEOUT_MS) the precached shell
// of the same route and locale is used. Only when a path has no shell does the
// request fail and the localized offline page take over.
const NAVIGATION_TIMEOUT_MS = 5000;

const appShell: RuntimeCaching = {
  matcher: ({ request, url, sameOrigin }) =>
    sameOrigin &&
    request.mode === "navigate" &&
    getOfflineShellPath(url.pathname) !== null,
  handler: async ({ request, url, event }) => {
    try {
      const preloaded = await (event as FetchEvent | undefined)
        ?.preloadResponse;
      if (preloaded) return preloaded;
      return await fetch(request, {
        signal: AbortSignal.timeout(NAVIGATION_TIMEOUT_MS),
      });
    } catch {
      const shellPath = getOfflineShellPath(url.pathname);
      const cached = shellPath ? await serwist.matchPrecache(shellPath) : null;
      if (cached) return cached;
      throw new Error("No cached app shell");
    }
  },
};

// Turbopack passes a worker its bootstrap config in the URL fragment
// (`turbopack-worker-*.js#params=...`). A response that comes straight out of
// the precache carries the URL without that fragment, so the worker would
// start with an empty `location.hash` and throw "Missing worker bootstrap
// config". Re-wrapping the body in a fresh Response, which has no URL of its
// own, makes the browser keep the requested URL, fragment included.
const WORKER_SCRIPT = /\/turbopack-worker-[^/]+\.js$/;

const keepWorkerFragment: SerwistPlugin = {
  cachedResponseWillBeUsed: async ({ request, cachedResponse }) => {
    // Matched on the URL: the precache strategy hands plugins a rebuilt
    // request whose `destination` is no longer "worker".
    if (!cachedResponse || !WORKER_SCRIPT.test(new URL(request.url).pathname)) {
      return cachedResponse;
    }
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      headers: cachedResponse.headers,
    });
  },
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { plugins: [keepWorkerFragment] },
  // Updates wait until the user accepts the reload prompt (SwUpdatePrompt).
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    appShell,
    { matcher: MODEL_HOSTS, handler: new NetworkOnly() },
    onnxRuntime,
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
