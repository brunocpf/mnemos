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

- Markdown-based editor
- Local persistence using IndexedDB
- Fast create, edit, and delete
- Works fully offline

### Offline Semantic Search

- Search notes by **meaning**, not keywords
- Embeddings computed **on-device** in a Web Worker
- Incremental indexing using deterministic chunking and hashing
- Search remains available without a network connection

### AI-Assisted Insights (Opt-in)

- One-click note summarization, user-initiated
  - **On device:** Qwen3-0.6B (ONNX, q4f16, about 570 MB, thinking disabled) via `transformers.js` in a Web Worker
  - **Server fallback:** Qwen3-30B (configurable) through the Hugging Face Inference API
- Ask across notes (RAG-style answers with source references) is **planned, not implemented yet**

### Privacy by Design

- Notes never leave the device unless explicitly sent for AI processing
- No background uploads or hidden sync
- Clear disclosure when server-side AI is used

### Internationalization

- UI localized in **English** and **Brazilian Portuguese**
- Notes can be written in any language
- AI responses follow the language of the user’s input

### PWA Experience

- Installable on desktop and mobile
- Offline support via Service Worker
- Store-ready via PWABuilder

---

## Architecture Overview

### Client

- **Next.js (App Router)**
- IndexedDB (via Dexie) for notes, chunks, and embeddings
- Web Workers for:
  - embedding generation
  - semantic search (cosine similarity)
- Service Worker for offline caching

### AI Strategy

#### Embeddings

- **Primary:** On-device embeddings (`Xenova/multilingual-e5-small`, q8, about 118 MB, English + Portuguese) via `transformers.js`
- **Fallback:** Optional server-side embeddings through the `embed` / `embedQuery` server actions, only when the user enables it in Settings

#### Summarization

- **Primary:** On-device Qwen3-0.6B in a Web Worker
- **Fallback:** The `summarize` server action (Hugging Face Inference)

#### Settings

| Setting | Options | Default |
| --- | --- | --- |
| Embeddings | `local-only`, `allow-fallback` | `local-only` |
| Summarizer | `local-only`, `allow-fallback`, `server-only` | `allow-fallback` |

`allow-fallback` tries the device first and falls back to the server when local inference fails (or, for summaries, takes over 30 s). With `local-only` nothing is ever sent to the server. `server-only` skips the local model and its download.

#### Server action safeguards

The server actions spend the deployer's `HF_API_TOKEN`, so they validate input with zod and enforce limits (see `src/lib/server-ai.ts`): at most 64 chunks per request, 2,000 characters per chunk or query, 20,000 characters per summary. They also apply a per-IP rate limit (60 embed requests/min, 10 summaries/min). The limiter is in-memory and best-effort: on serverless platforms each instance keeps its own counters, so it will not stop a determined attacker. Use platform-level rate limiting for stronger protection. Errors come back as typed results (`invalid_input`, `rate_limited`, `not_configured`, `upstream_error`) rather than thrown exceptions.

## Offline Behavior

| Feature             | Offline |
| ------------------- | ------- |
| Create / edit notes | ✅      |
| Semantic search     | ✅      |
| Summarization       | ✅ (once the local model is downloaded; server fallback needs a network) |
| Ask across notes    | Planned |

When offline:

- Server-backed AI actions are unavailable
- The app remains fully usable for core note-taking and search

---

## Non-Goals (MVP)

The following are intentionally out of scope for the MVP:

- User accounts or authentication
- Cloud sync
- Real-time collaboration
- Automatic translation
- Background AI processing

These are deferred to keep the MVP focused and reliable.

---

## Development Status

Progress is tracked using **GitHub Issues + GitHub Projects**, organized by end-to-end pipelines:

- Notes
- Indexing
- Semantic Search
- RAG (Ask Mnemos) — planned
- Offline / PWA
- i18n

Each pipeline moves through:
**Backlog → In Progress → Working → Polished → Shipped**

---

## Getting Started (Local Development)

```bash
npm install
cp .env.example .env.local   # optional, see below
npm run dev
```

The app runs at http://localhost:3000.

> On first run, the browser downloads the embedding model (and the summarization model unless the summarizer is `server-only`) from Hugging Face and caches it. The summarization model is about 570 MB; a WebGPU-capable browser is recommended.

### Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `HF_API_TOKEN` | server | Token for the server fallbacks. Without it they return a `not_configured` error. |
| `NEXT_PUBLIC_EMBEDDING_MODEL_ID` | client | On-device embedding model (default `Xenova/multilingual-e5-small`). Changing it re-indexes notes. |
| `NEXT_PUBLIC_EMBEDDING_DTYPE` | client | Embedding weights precision (default `q8`). |
| `NEXT_PUBLIC_EMBEDDING_QUERY_PREFIX` / `NEXT_PUBLIC_EMBEDDING_DOCUMENT_PREFIX` | client + server | Text prepended to queries / note chunks. Defaults to `query: ` / `passage: ` for e5 models, empty otherwise. |
| `SERVER_EMBEDDING_MODEL` | server | Hosted twin of the embedding model for the server fallback (default `intfloat/multilingual-e5-small`). Must be the same underlying model. |
| `NEXT_PUBLIC_SUMMARIZATION_MODEL_ID` | client | On-device summarization model (default `onnx-community/Qwen3-0.6B-ONNX`). |
| `NEXT_PUBLIC_SUMMARIZATION_DTYPE` | client | Summarization weights precision (default `q4f16`). |
| `SERVER_SUMMARIZER_MODEL` | server | Server summarization model (default `Qwen/Qwen3-30B-A3B-Instruct-2507`). |
| `NEXT_PUBLIC_DEFAULT_SEMANTIC_SEARCH_TOP_K` | client | Search results to return (default 12). |
| `NEXT_PUBLIC_DEFAULT_SEMANTIC_SEARCH_OVERSAMPLING_FACTOR` | client | Candidate oversampling factor (default 2). |

### Tests

```bash
npx vitest run   # unit tests in __tests__/
npm run lint
```

---

## Privacy Policy (Summary)

- All notes are stored locally in the browser.
- Embeddings are computed on-device by default.
- Text is sent to the server only if you choose `allow-fallback` / `server-only` in Settings: note text for summaries, and chunk or query text for embeddings.
- The server forwards that text to the Hugging Face Inference API ; the app itself does not store it.
- No analytics or telemetry are collected by default.
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
