# Versioning and release notes

Mnemos follows [Semantic Versioning](https://semver.org/) and keeps a [Keep a Changelog](https://keepachangelog.com/) file at the repo root ([CHANGELOG.md](../CHANGELOG.md)).

## Policy

- **0.x (current):** the app is pre-1.0. The first published build is `0.1.0`. While below 1.0, a minor bump (`0.2.0`) may include user-visible changes or data-model changes; a patch bump (`0.1.1`) is fixes only.
- **1.0.0:** cut when the app is in the stores, the IndexedDB schema is considered stable, and the checklist in [#10](https://github.com/brunocpf/mnemos/issues/10) is done.
- **After 1.0:** major = breaking change for users or data that needs a migration plan, minor = new features, patch = fixes.
- **Data changes:** the IndexedDB schema is versioned separately in `src/client-data/db.ts`. Never edit a released Dexie version; add the next one with an upgrade function and mention it under "Changed" in the changelog.
- **Embedding model changes:** changing `NEXT_PUBLIC_EMBEDDING_MODEL_ID` re-indexes every note on the user's device. Treat a default-model change as a minor bump and call it out in the changelog.

## Where the version lives

`package.json` currently has no `version` (the package is `private`). When the first build is published:

1. Move the **Unreleased** entries in `CHANGELOG.md` under a dated `## [0.1.0] - YYYY-MM-DD` heading and add a fresh empty **Unreleased** section.
2. Add `"version": "0.1.0"` to `package.json` (`npm version 0.1.0 --no-git-tag-version`).
3. Tag the commit (`git tag v0.1.0`) and update the compare links at the bottom of the changelog.
4. Reuse the changelog entries for the store's "What's new" text (see [store-listing/](store-listing/)).

## Changelog conventions

Use the Keep a Changelog headings (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`), write for users rather than for committers, and add an entry in the same pull request as the change.
