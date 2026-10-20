# Changelog

All notable changes to Mnemos are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as described in [docs/versioning.md](docs/versioning.md).

Mnemos has not had a tagged release yet, so everything built so far is listed under **Unreleased**. The first published build will be cut as `0.1.0`.

## [Unreleased]

### Added

- Notes: a Tiptap rich-text editor that stores Markdown (headings, inline marks, lists, blockquotes, alignment, links, images by URL), rename, delete with Undo (deleted notes are purged from the device after 7 days), an overflow menu on note list items, and a placeholder and accessible label on the editor.
- Folders: nested folders (Dexie v4 `folders` table and `notes.folderId`; existing notes stay at the root), a folder tree with active state, create/rename/move/delete with a confirmation that moves a deleted folder's notes and subfolders to its parent, move a note from its menu or with the `M` key, `/folders/[folderId]` pages with breadcrumbs that also open offline, and empty states. Search stays global.
- Import/export: Settings can export every note as a ZIP of Markdown files (folders as directories, empty folders kept, id and timestamps in YAML front matter) and import a ZIP or loose `.md` files, either as new notes or merged by id (keep the newer, or keep local), with zip-slip, size, count and non-text checks. Imported notes are re-indexed for search. All of it runs on the device.
- Rich-editor dialog for link and image URLs, replacing `window.prompt`.
- Semantic search over notes: deterministic chunking and content hashing, incremental on-device indexing in Web Workers (Comlink), cosine ranking, highlighted matches in the results and the opened note, and a title-aware embedding body.
- On-device embeddings with `Xenova/multilingual-e5-small` (q8, about 118 MB, English and Portuguese), replacing the English-only `gte-small`.
- Summaries: a Summarize action per note, on-device with `Qwen3-0.6B` (q4f16, about 570 MB, thinking disabled), an opt-in server fallback (Hugging Face Inference), a prompt that keeps the note's language and resists prompt injection, and an explanation of why a summary failed with retry and settings shortcuts.
- Resumable, chunked model downloads backed by the Origin Private File System, with a storage warning in Settings.
- Settings page for the summarizer (`local-only`, `allow-fallback`, `server-only`) and embeddings (`local-only`, `allow-fallback`), download progress and indexing-alert preferences.
- Server actions `embed`, `embedQuery` and `summarize` with zod input limits, typed error results and a best-effort per-IP rate limit.
- Welcome (onboarding) screen explaining on-device versus cloud AI.
- Privacy policy page and links to it from onboarding and Settings.
- Internationalization with `en-US` and `pt-BR`, locale-aware dates and a test that keeps both message files in sync.
- PWA: web app manifest with standard and maskable icons and a "New note" shortcut, Serwist service worker, localized offline fallback page, offline "new note" shell, and an update prompt that waits for the user before reloading.
- Light and dark themes that follow the system setting, view transitions between screens and a keyboard-aware bottom bar for mobile.
- Project docs: README, MIT `LICENSE`, `.env.example`, `docs/model-eval.md` (model evaluation scripts in `scripts/eval/`), and this changelog.
- CI (lint, typecheck, tests, build) and weekly grouped Dependabot updates.

### Changed

- README and privacy policy rewritten to match actual behavior, including that summaries default to `allow-fallback` and that Ask Mnemos is not implemented.
- Default summarization model is `Qwen3-0.6B` (570 MB), after `Phi-3.5-mini` (2.3 GB) and `Qwen3-1.7B` (fails to load in the browser) were evaluated.
- Dependencies upgraded, including Next.js 16, React 19, TypeScript 6, ESLint 10, Vitest 5, `ai` 7 and `@huggingface/transformers` 4.

### Fixed

- Deleted notes no longer keep searchable chunks and embeddings (IndexedDB schema v2 cleans up existing rows).
- Summarize becomes enabled after a new note's first save.
- The offline page picks its language from the URL or the browser.
- Toolbar overflow at small widths no longer hides the first editor button.
- Model downloads fall back to a plain request when a small file reports a wrong `Content-Range` length.
- Mobile layout fixes: onboarding scroll on small screens, select popups, scrollable summary dialog, reduced-motion support and search contrast.
- Note list dates follow the active locale, and Portuguese wording was refined.
- The embedding, chunking and summarization workers start again once the service worker controls the page (the precached worker script lost its `#params=` fragment and threw "Missing worker bootstrap config"), so on-device search and summaries keep working after the PWA is installed. The share target also declares its `enctype`.

### Security

- Server actions validate input size, rate limit per client IP and never accept unbounded text; the server summary prompt wraps note text in random tags to resist prompt injection.
- `npm audit` fixes for transitive dependencies.

### Not yet implemented

- Ask Mnemos (RAG answers across notes) — [#7](https://github.com/brunocpf/mnemos/issues/7)
- Store packaging and share target — [#9](https://github.com/brunocpf/mnemos/issues/9), [#12](https://github.com/brunocpf/mnemos/issues/12)
- Import/export, folders and push reminders — [#11](https://github.com/brunocpf/mnemos/issues/11), [#16](https://github.com/brunocpf/mnemos/issues/16), [#13](https://github.com/brunocpf/mnemos/issues/13)

[Unreleased]: https://github.com/brunocpf/mnemos/commits/main
