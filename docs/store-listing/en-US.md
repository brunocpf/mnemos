# Store listing: English (en-US)

Draft copy for the Google Play (via PWABuilder / Trusted Web Activity), Microsoft Store and Apple App Store listings. Character limits are the stores' current limits; re-check them at submission time. Text in `[brackets]` is something the owner must fill in or confirm.

Claims in this copy were checked against the code on 2026-10-20. Ask Mnemos (chat over your notes) is **not** implemented and is deliberately not mentioned.

## App name

**Mnemos** (6 characters; limits: Play 30, Microsoft 256, Apple 30)

Subtitle / tagline options (Apple subtitle limit 30):

- Private notes, smart search (27)
- Notes that stay on your device (30)

## Short description (Google Play, max 80)

> Private notes with on-device smart search and optional AI summaries. (68)

Alternatives:

- Notes that stay on your device, searchable by meaning. (54)
- Offline-first notes. Find ideas by meaning, not keywords. (57)

## Summary (Microsoft Store, max 100)

> A private, offline-first notes app. Search by meaning and summarize notes on your device. (89)

## Long description (Google Play max 4000, Microsoft max 10000, Apple max 4000)

```text
Mnemos is a private notebook that helps you find what you wrote by what it means, not just by the exact words you remember.

Your notes live on your device. There is no account, no sync service and no analytics. Smart search and summaries run on your device too, so they keep working on a plane, on the train or anywhere the signal drops.

WRITE
• A clean editor with headings, bold, italic, underline, lists, quotes, inline code, links and images (by URL)
• Rename notes and delete with Undo
• Works fully offline once it has loaded

FIND IDEAS BY MEANING
• Type what you remember ("that idea about the bakery loyalty cards") and Mnemos surfaces the right note even if you never used those words
• Works in English and Portuguese, including searching in one language for notes in the other
• Matches are highlighted so you see why a note came up
• Indexing happens on your device and only re-processes notes you changed

SUMMARIZE IN ONE TAP
• Tap Summarize on a long note to get a short bullet summary in the note's own language
• Runs on your device by default
• You choose where summaries run in Settings: on your device only, on your device with a cloud fallback, or cloud only

PRIVACY YOU CAN CHECK
• Notes are stored in your browser's local database, not on our servers
• If you allow a cloud fallback, only the text needed for that single summary or search is sent for processing, and Mnemos does not store it. "On your device only" sends nothing
• Each summary tells you whether it was made on your device or in the cloud
• Open source under the MIT license

ONE-TIME DOWNLOADS
The first time you use search and summaries, Mnemos downloads its on-device AI models (about 120 MB for search and about 570 MB for summaries). Downloads resume if they are interrupted. After that they work offline. Wi-Fi is recommended.

AVAILABLE IN
English and Brazilian Portuguese, with light and dark appearance that follows your device.

Mnemos is an early release. Folders, import/export and chat-style questions across your notes are on the roadmap but not available yet.
```

(About 2,000 characters.)

## Keywords

Apple App Store keyword field (max 100 characters, comma-separated, no spaces):

```text
notes,notebook,offline,private,semantic search,second brain,markdown,summary,local,ai,journal,pkm
```

Google Play / Microsoft Store tags and search terms (no hard keyword field on Play; use naturally in the description):

- private notes app, offline notes, notes with search, semantic search, on-device AI, second brain, personal knowledge management, markdown notes, note summarizer, local-first
- Microsoft Store allows up to 7 search terms of 30 characters: `private notes`, `offline notes`, `semantic search`, `second brain`, `note summarizer`, `local-first`, `on-device AI`

## Categories

- Google Play: Productivity
- Microsoft Store: Productivity
- Apple App Store: Productivity (secondary: Utilities)
- (Matches the web manifest `categories`: productivity, utilities)

## What's new (release notes)

First release (`0.1.0`), max 500 characters for Play, 4000 for Apple/Microsoft:

```text
First release of Mnemos.
• Private notes stored on your device
• Search by meaning in English and Portuguese, offline
• One-tap summaries, on your device by default
• Delete with Undo, light and dark appearance, English and Portuguese interface
• Installable and works offline
```

For later versions, reuse the matching entry from [CHANGELOG.md](../../CHANGELOG.md), rewritten for users.

## Privacy and data-safety answers

Use these when the store forms ask. Keep them consistent with the in-app [privacy policy](../../src/app/[locale]/privacy-policy/page.tsx).

- **Privacy policy URL:** `[https://<production-domain>/privacy-policy]` (also available at `/pt-BR/privacy-policy`). The page must be publicly reachable without signing in.
- **Data collected by the developer:** none by default. There are no accounts, analytics, ads or third-party SDKs.
- **Data sent off the device:** only if the user keeps the default summary setting and the on-device model cannot run (for example it has not finished downloading), chooses "Cloud only", or enables the embeddings fallback. In those cases note text or a search query is sent to the app's server and on to Hugging Face for processing, used only to produce the result, and not stored by Mnemos. For Play's Data safety form, declare "User content" (notes text) as shared for app functionality, optional, processed ephemerally, encrypted in transit; users can avoid it with "On your device only".
- **Data deletion:** all data is local; deleting notes in the app or clearing site data / uninstalling removes it.
- **Age rating:** suitable for everyone; the policy states it is not intended for children under 13 `[confirm questionnaire answers per store]`.
- **Permissions:** none beyond a standard web app (no camera, location, contacts or microphone).

## Support / marketing links

- Support URL: https://github.com/brunocpf/mnemos/issues
- Source code: https://github.com/brunocpf/mnemos
- Marketing URL: `[production URL]`
- Contact email: `[owner to provide]`
