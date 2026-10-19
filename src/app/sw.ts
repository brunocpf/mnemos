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

// The app uses `as-needed` locale prefixes: pt-BR lives under /pt-BR, en-US at
// the root. Pick the offline page from the URL prefix first, then from the
// browser's Accept-Language header, falling back to English.
function wantsPortuguese({ request }: { request: Request }) {
  const { pathname } = new URL(request.url);
  if (pathname === "/pt-BR" || pathname.startsWith("/pt-BR/")) return true;
  if (pathname.startsWith("/en-US")) return false;
  const accept = request.headers.get("Accept-Language")?.toLowerCase() ?? "";
  return accept.startsWith("pt");
}

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

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Updates wait until the user accepts the reload prompt (SwUpdatePrompt).
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    newNoteOffline,
    { matcher: MODEL_HOSTS, handler: new NetworkOnly() },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/pt-BR/~offline",
        matcher: (ctx) =>
          ctx.request.destination === "document" && wantsPortuguese(ctx),
      },
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
