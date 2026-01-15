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

- One-click note summarization
- Ask questions across multiple notes (RAG-style answers)
- Answers include references to source notes
- AI calls are user-initiated and transparent

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

- **Primary:** On-device embeddings using a Hugging Face sentence transformer via `transformers.js`
- **Fallback:** Optional server-side embeddings for devices that cannot reliably run local inference (opt-in)

#### LLM (Server-side)

- Hugging Face hosted model for:
  - note summarization
  - cross-note question answering
- Invoked only when the user requests AI assistance

---

## Offline Behavior

| Feature             | Offline |
| ------------------- | ------- |
| Create / edit notes | ✅      |
| Semantic search     | ✅      |
| Summarization       | ✅      |
| Ask across notes    | ❌      |

When offline:

- AI actions are disabled or queued
- The app remains fully usable for core note-taking and search

---

## Non-Goals (MVP)

The following are intentionally out of scope for the MVP:

- User accounts or authentication
- Cloud sync
- Real-time collaboration
- Automatic translation
- Background AI processing
- Local LLM inference

These are deferred to keep the MVP focused and reliable.

---

## Development Status

Progress is tracked using **GitHub Issues + GitHub Projects**, organized by end-to-end pipelines:

- Notes
- Indexing
- Semantic Search
- RAG (Ask Mnemos)
- Offline / PWA
- i18n

Each pipeline moves through:
**Backlog → In Progress → Working → Polished → Shipped**

---

## Getting Started (Local Development)

```bash
# install dependencies
npm install

# start dev server
npm run dev
```

The app runs at http://localhost:3000.

> Note: On-device embeddings require an initial model download on first run.

---

## Privacy Policy (Summary)

- All notes are stored locally in the browser.
- Embeddings are computed on-device by default.
- Server-side AI is used only when explicitly triggered by the user.
- No analytics or telemetry are collected by default.
- A full privacy policy is available in the app.

---

## License

TBD

---

## Why This Project Exists

Mnemos is both a usable product and a technical exploration of:

- local-first web applications
- modern PWA capabilities
- practical AI integration under real browser constraints
- explicit, user-controlled AI design

**It favors clarity, trust, and correctness over automation and opacity.**
