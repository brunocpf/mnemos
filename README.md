# Mnemos

**Mnemos** is a **privacy-first, offline-capable Progressive Web App (PWA)** for personal knowledge management.  
It acts as a lightweight “second brain”, allowing users to capture notes and retrieve them by **meaning**, not just keywords—while keeping data local by default.

Mnemos is designed to work **reliably offline**, use AI **only when explicitly requested**, and respect the constraints of real-world browsers and devices.

---

## Core Principles

- **Local-first by default**  
  Notes and embeddings are stored on the device. No account or cloud sync is required.

- **Offline-first, online-enhanced**  
  Core functionality (notes, semantic search) works offline. AI features gracefully degrade when offline.

- **Explicit AI usage**  
  AI is never used implicitly. When text is sent to a server, it is clearly disclosed.

- **Progressive enhancement**  
  The app adapts to device capabilities instead of assuming ideal conditions.

---

## Features

### Notes

- Rich-text editor (Tiptap) that stores notes as Markdown: headings, bold/italic/underline/strikethrough, inline code, bullet and numbered lists, blockquotes, text alignment, links and images (inserted by URL)
- Local persistence using IndexedDB (via Dexie)
- Fast create, edit and rename; deleting shows an Undo action, and deleted notes are kept hidden on the device for 7 days before being permanently purged (there is no trash screen yet)
- Works fully offline once the app has loaded

### Offline Semantic Search

- Search notes by **meaning**, not keywords, in English and Portuguese (including across the two)
- Notes are split into chunks and embedded **on-device** in Web Workers
- Incremental indexing using deterministic chunking and content hashing: only changed notes are re-embedded
- Matches are highlighted in the results and in the opened note
- Search works without a network connection once the embedding model has been downloaded (the first run needs a connection for that)

### AI-Assisted Insights (Opt-in)

- One-click note summarization, user-initiated
  - **On device:** Qwen3-0.6B (ONNX, q4f16, about 570 MB, thinking disabled) via `transformers.js` in a Web Worker
  - **Server fallback:** Qwen3-30B (configurable) through the Hugging Face Inference API
- **Ask Mnemos** (RAG-style answers across notes with source references) is **not implemented**. It is tracked in [#7](https://github.com/brunocpf/mnemos/issues/7) and nothing in the app or this README should be read as promising it today

### Privacy by Design

- Notes never leave the device unless server-side AI is used (see [Privacy](#privacy-policy-summary) for exactly when)
- No background uploads or hidden sync, no accounts, no analytics
- Clear disclosure when server-side AI is used: onboarding, Settings and the in-app privacy policy all describe it, and each summary says whether it was generated on the device or in the cloud

### Internationalization

- UI localized in **English** (`en-US`) and **Brazilian Portuguese** (`pt-BR`); a test keeps both message files in sync
- Notes can be written in any language
- Summaries are prompted to follow the language of the note

### PWA Experience

- Installable on desktop and mobile (web app manifest, standard and maskable icons, a "New note" shortcut)
- Offline support via a Serwist Service Worker: the app shell is precached and served for every note/folder URL when the network is down, there is a localized offline fallback page, and model files are deliberately left to the models' own cache
- In-app prompt to reload when a new version is available
- Store packaging (PWABuilder) is still being prepared, see [#9](https://github.com/brunocpf/mnemos/issues/9)

---

## Architecture Overview

### Client

- **Next.js (App Router)**, React, Tailwind CSS, `next-intl` for i18n
- IndexedDB (via Dexie) for notes, chunks, embeddings and a local log of on-device indexing errors; settings and the onboarding flag live in `localStorage`
- Web Workers (talking to the UI through Comlink) for:
  - chunking
  - embedding generation (documents and queries)
  - summarization
- Ranking of query vs. stored embeddings (dot product on normalized vectors) runs on the main thread (moving it to a worker is on the tech-debt list)
- Service Worker (Serwist) for offline caching
- Models run with `transformers.js` on WebGPU when available and fall back to WASM

### AI Strategy

#### Embeddings

- **Primary:** On-device embeddings (`Xenova/multilingual-e5-small`, q8, about 118 MB, English + Portuguese) via `transformers.js`
- **Fallback:** Optional server-side embeddings through the `embed` / `embedQuery` server actions, only when the user enables it in Settings

#### Summarization

- **Primary:** On-device Qwen3-0.6B in a Web Worker
- **Fallback:** The `summarize` server action (Hugging Face Inference)

#### Settings

| Setting    | Options                                       | Default          |
| ---------- | --------------------------------------------- | ---------------- |
| Embeddings | `local-only`, `allow-fallback`                | `local-only`     |
| Summarizer | `local-only`, `allow-fallback`, `server-only` | `allow-fallback` |

`allow-fallback` tries the device first and falls back to the server when local inference fails (or, for summaries, takes over 30 s). With `local-only` nothing is ever sent to the server. `server-only` skips the local model and its download.

#### Server action safeguards

The server actions are the only code that ever receives note text. They spend the deployer's `HF_API_TOKEN`, so they validate input with zod and enforce limits (see `src/lib/server-ai.ts`): at most 64 chunks per request, 2,000 characters per chunk or query, 20,000 characters per summary. They also apply a per-IP rate limit (60 embed requests/min, 10 summaries/min). The limiter is in-memory and best-effort: on serverless platforms each instance keeps its own counters, so it will not stop a determined attacker. Use platform-level rate limiting for stronger protection. Errors come back as typed results (`invalid_input`, `rate_limited`, `not_configured`, `upstream_error`) rather than thrown exceptions.

## Offline Behavior

| Feature             | Offline                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Open the app        | ✅ after the first visit (shell is precached)                                                                            |
| Open a saved note   | ✅ any note, folder or route, in both locales: the precached shell reads the id from the URL and loads it from IndexedDB |
| Create / edit notes | ✅                                                                                                                       |
| Semantic search     | ✅ once the embedding model (about 118 MB) has been downloaded; notes written before that are indexed afterwards         |
| Summarization       | ✅ once the on-device model (about 570 MB) has been downloaded; the server fallback needs a network                      |
| Ask across notes    | Not implemented                                                                                                          |

When offline:

- Server-backed AI actions are unavailable
- The app remains fully usable for core note-taking and search
- Every app route (home, `/note` with or without `noteId`, folders, settings, privacy policy, share) is served from its precached shell, then hydrates from IndexedDB. A shell is only used for its own locale
- Paths that have no shell show a localized offline page instead of the browser error

---

## Non-Goals (MVP)

The following are intentionally out of scope for the MVP:

- User accounts or authentication
- Cloud sync
- Real-time collaboration
- Automatic translation
- Background AI processing

These are deferred to keep the MVP focused and reliable. Folders, share target, push reminders and Ask Mnemos are on the roadmap but **not shipped**; see the [open issues](https://github.com/brunocpf/mnemos/issues).

---

## Development Status

Mnemos is pre-1.0 and has not been published to a store yet. Progress is tracked with **GitHub Issues**, organized by end-to-end pipelines:

| Pipeline                                                             | State                                                                                    |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Notes (editor, delete with Undo, rename)                             | Working                                                                                  |
| Indexing (chunking, on-device embeddings, resumable model downloads) | Working                                                                                  |
| Semantic search                                                      | Working                                                                                  |
| Summaries (on device, with opt-in server fallback)                   | Working                                                                                  |
| Offline / PWA                                                        | Working; store packaging in progress ([#9](https://github.com/brunocpf/mnemos/issues/9)) |
| i18n (en-US, pt-BR)                                                  | Working                                                                                  |
| RAG (Ask Mnemos)                                                     | **Not implemented** ([#7](https://github.com/brunocpf/mnemos/issues/7))                  |

Release tracking is in [#10](https://github.com/brunocpf/mnemos/issues/10). See [CHANGELOG.md](CHANGELOG.md) for what changed, [docs/versioning.md](docs/versioning.md) for the versioning policy and [docs/store-listing/](docs/store-listing/) for the store copy and screenshot list.

---

## Getting Started (Local Development)

```bash
npm install
cp .env.example .env.local   # optional, see below
npm run dev
```

The app runs at http://localhost:3000.

> Requires Node 22 or newer. On first run, the browser downloads the embedding model (and the summarization model unless the summarizer is `server-only`) from Hugging Face and caches it. The summarization model is about 570 MB (set `NEXT_PUBLIC_SUMMARIZATION_MODEL_ID=onnx-community/Phi-3.5-mini-instruct-onnx-web` for a ~2.3 GB, higher-quality option); a WebGPU-capable browser is recommended.
>
> **Resumable downloads:** large model files are fetched in 8 MiB chunks with HTTP Range requests and stored in the browser's Origin Private File System (IndexedDB if OPFS is unavailable). If the page is reloaded or the tab is closed mid-download, the next load resumes from the last stored chunk instead of starting over; if the file changed upstream (ETag mismatch) it restarts cleanly. If the device is out of storage, the download still completes but is not saved, and Settings shows a warning. The code is in `src/lib/resumable-download/`.

### Environment variables

| Variable                                                                       | Scope           | Purpose                                                                                                                                   |
| ------------------------------------------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `HF_API_TOKEN`                                                                 | server          | Token for the server fallbacks. Without it they return a `not_configured` error.                                                          |
| `NEXT_PUBLIC_EMBEDDING_MODEL_ID`                                               | client          | On-device embedding model (default `Xenova/multilingual-e5-small`). Changing it re-indexes notes.                                         |
| `NEXT_PUBLIC_EMBEDDING_DTYPE`                                                  | client          | Embedding weights precision (default `q8`).                                                                                               |
| `NEXT_PUBLIC_EMBEDDING_QUERY_PREFIX` / `NEXT_PUBLIC_EMBEDDING_DOCUMENT_PREFIX` | client + server | Text prepended to queries / note chunks. Defaults to `query: ` / `passage: ` for e5 models, empty otherwise.                              |
| `SERVER_EMBEDDING_MODEL`                                                       | server          | Hosted twin of the embedding model for the server fallback (default `intfloat/multilingual-e5-small`). Must be the same underlying model. |
| `NEXT_PUBLIC_SUMMARIZATION_MODEL_ID`                                           | client          | On-device summarization model (default `onnx-community/Qwen3-0.6B-ONNX`).                                                                 |
| `NEXT_PUBLIC_SUMMARIZATION_DTYPE`                                              | client          | Summarization weights precision (default `q4f16`).                                                                                        |
| `SERVER_SUMMARIZER_MODEL`                                                      | server          | Server summarization model (default `Qwen/Qwen3-30B-A3B-Instruct-2507`).                                                                  |
| `NEXT_PUBLIC_DEFAULT_SEMANTIC_SEARCH_TOP_K`                                    | client          | Search results to return (default 12).                                                                                                    |
| `NEXT_PUBLIC_DEFAULT_SEMANTIC_SEARCH_OVERSAMPLING_FACTOR`                      | client          | Candidate oversampling factor (default 2).                                                                                                |

### Tests

```bash
npx vitest run   # unit tests in __tests__/
npm run lint
```

---

## Privacy Policy (Summary)

- All notes are stored locally in the browser.
- Embeddings are computed on-device by default (`local-only`); nothing is sent for search unless you enable the embeddings fallback in Settings (or accept the prompt that offers it when on-device indexing fails).
- **Summaries default to `allow-fallback`.** When you press Summarize, the note text is processed on the device if the local model is ready; if it is not ready yet (for example still downloading), fails, or takes over 30 s, and you are online, the full note text is sent to the server. Choose `local-only` in Settings to prevent that.
- The server forwards that text to the Hugging Face Inference API (which may route it to a third-party inference provider); the app itself does not store it. The server sees your IP address for per-IP rate limiting (kept in memory only), and the hosting platform may log requests.
- Model files are downloaded from Hugging Face (they reveal your IP address to Hugging Face but no note content).
- No analytics or telemetry. At most one functional cookie: the language preference set by `next-intl`.
- A full privacy policy is available in the app.

---

## License

Released under the [MIT License](LICENSE).

---

## Why This Project Exists

Mnemos is both a usable product and a technical exploration of:

- local-first web applications
- modern PWA capabilities
- practical AI integration under real browser constraints
- explicit, user-controlled AI design

**It favors clarity, trust, and correctness over automation and opacity.**

### Model evaluation

`scripts/eval/` holds the retrieval and summarization evals behind the model choice (not part of the test run); see `docs/model-eval.md` for results.

```bash
node scripts/eval/embeddings.mjs            # recall@1/3 and MRR for each candidate
node scripts/eval/summaries.mjs qwen3_06    # summaries for ten EN/PT notes
```
