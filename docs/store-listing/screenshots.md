# Screenshots and branding assets the owner needs to capture

Images cannot be produced by the automated docs work, so this is the exact shot list. Store size rules change; confirm the sizes below in each store's console at submission time (they were current when this was written).

## Before you start

1. Build a production build (`npm run build && npm start`) or use the deployed site, so the screenshots do not show dev overlays or the Next.js dev indicator.
2. Use a **fresh browser profile** (empty IndexedDB and `localStorage`), so the welcome screen appears once and the notes list starts empty.
3. In Chrome DevTools use _Toggle device toolbar_ with a custom device for each size below, device pixel ratio 1 (or capture at DPR 2 and export at the size listed). Hide scrollbars and keep the status bar free of personal data.
4. Let both models finish downloading first (Settings shows **Ready** for each) so search and summaries work during capture. Set **Summaries run on** to **On your device only** so the summary dialog shows "Generated on your device." and no server is involved.
5. Capture every screen in **English (`/`) and Portuguese (`/pt-BR`)**, because each store listing language gets its own set. Capture light mode for the main set and dark mode for one or two extras (the app follows the system theme).
6. Use the demo notes below (typed by hand, or pasted into new notes). Do not use real personal notes.

## Demo notes

Create these before shooting, titles first. English set:

| Title                | Content (short)                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Bakery loyalty cards | Idea: stamp card for the corner bakery, ten stamps for a free pão de queijo. Print on recycled paper. |
| Trip to Lisbon       | Flights on the 14th, tram 28, pastéis de nata at Belém, book the apartment near Alfama.               |
| Reading list         | Deep Work, The Pragmatic Programmer, Atomic Habits. Finish one per month.                             |
| Weekly review        | What went well, what slipped, three priorities for next week.                                         |
| Meeting with design  | Decided on a simpler onboarding, move settings into a single page, ship a dark theme.                 |
| Sourdough notes      | 75% hydration, 20% starter, fold every 30 minutes, bake at 240 °C with steam.                         |

Portuguese set (for the pt-BR shots): "Cartões de fidelidade da padaria", "Viagem a Lisboa", "Lista de leitura", "Revisão semanal", "Reunião com o design", "Anotações de pão de fermentação natural", with equivalent text.

Make one note long (four to six paragraphs, for example the "Weekly review" note) so the summary is meaningful.

## Required screenshots (phone, portrait)

Primary size **1080 × 1920** (9:16). Google Play accepts 9:16 or 16:9 with each side between 320 and 3840 px, 2 to 8 images. For Apple, re-export the same compositions at the current iPhone sizes (for example 1290 × 2796 for 6.7″ and 1320 × 2868 for 6.9″); the app is a PWA, so Apple listings only apply if you package it for iOS.

| #   | Screen                                                 | Route                                   | What to show                                                                                                                                                          |
| --- | ------------------------------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Notes list                                             | `/`                                     | Six demo notes, search bar visible and empty, "New Note" button                                                                                                       |
| 2   | Semantic search                                        | `/` with the search typed               | Query `a loyalty idea for a shop` (EN) or `ideia de fidelidade para loja` (PT) returning "Bakery loyalty cards" with highlighted snippet, to show matching by meaning |
| 3   | Cross-language search (optional, strong selling point) | `/`                                     | Query in one language finding the note written in the other                                                                                                           |
| 4   | Editor                                                 | `/note?new=1` or an existing note       | A formatted note: heading, bold, bullet list, a link, toolbar visible                                                                                                 |
| 5   | Summary                                                | open "Weekly review", tap **Summarize** | Summary dialog showing three bullets and "Generated on your device."                                                                                                  |
| 6   | Settings                                               | `/settings`                             | Summaries and Embeddings set to "On your device only", model status "Ready"                                                                                           |
| 7   | Privacy policy                                         | `/privacy-policy`                       | Hero "Your notes stay on your device" and the first section                                                                                                           |
| 8   | Welcome screen                                         | `/` on a fresh profile                  | Onboarding card ("Welcome to Mnemos"), captured before dismissing it                                                                                                  |

Order for the store gallery: 2, 1, 4, 5, 6, 8 (then 3, 7 if there is room). Store the files as `docs/store-listing/screenshots/<store>/<locale>/<NN>-<screen>.png` once captured (create that folder; do not put them under `public/`).

## Required screenshots (desktop, landscape)

Primary size **1920 × 1080**. Microsoft Store requires at least one desktop screenshot of at least 1366 × 768 (1 to 10 images, PNG); 1920 × 1080 is fine for the optional 16:9 gallery on other stores. Capture with the installed PWA window (not a browser tab with tabs and address bar) where possible.

| #   | Screen                         | Route               | What to show                              |
| --- | ------------------------------ | ------------------- | ----------------------------------------- |
| D1  | Notes list with search results | `/`                 | Same as phone #2 at desktop width         |
| D2  | Editor                         | `/note?noteId=<id>` | A formatted note, full toolbar            |
| D3  | Summary                        | note view           | Summary dialog open                       |
| D4  | Settings                       | `/settings`         | As phone #6                               |
| D5  | Dark mode                      | `/`                 | Notes list in dark theme (one extra shot) |

## Other store assets

| Asset                        | Size / format                                                                                                     | Status                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| App icon, Google Play        | 512 × 512 PNG, 32-bit, no transparency required                                                                   | Source exists: `src/app/icon.png` (1024 × 1024) and `public/img/android/android-launchericon-512-512.png`. **Owner sign-off needed.** |
| Maskable icon                | 512 × 512 PNG, safe zone in the centre 80%                                                                        | Exists in `public/img/maskable/android/`. Check it in Chrome DevTools > Application > Manifest > "Maskable" preview.                  |
| Google Play feature graphic  | 1024 × 500 PNG/JPG                                                                                                | **Missing.** Needs design: logo/wordmark plus the tagline "Private notes, smart search".                                              |
| Microsoft Store logos        | Packaged automatically by PWABuilder from the manifest icons; optional 300 × 300 store logo and 720 × 1080 poster | PWABuilder will generate; review the output.                                                                                          |
| Apple App Icon               | 1024 × 1024 PNG, no transparency                                                                                  | Same artwork as `src/app/icon.png`; check it has no transparent pixels.                                                               |
| Short promo video (optional) | 30 s, see demo script below                                                                                       | Not started                                                                                                                           |

## Demo script (cold-start walkthrough, about 90 seconds)

Use this for the store video, the README GIF and as the polish checklist for issue #10 ("cold-start walkthrough feels polished").

1. Open the app in a fresh profile. Welcome screen appears; tap **Continue**.
2. Empty state: tap **Create your first note**. Type a title and a few lines with a heading and a list. Show it saved automatically.
3. Create or paste the remaining demo notes (or start from a prepared profile).
4. Search for an idea by meaning (not a word in the note) and show the highlighted match.
5. Open **Weekly review**, tap **Summarize**, show the on-device summary and the "Generated on your device." label.
6. Open **Settings**: show "On your device only" for summaries and embeddings and the model **Ready** status.
7. Toggle the device to airplane mode, reload, and show notes and search still work.
8. End on the privacy policy headline: "Your notes stay on your device."

Anything in that flow that looks rough (empty state, loading text, model-download wait on first run) is a polish item for the checklist rather than something to hide in the screenshots.

## What remains for the owner

- [ ] Capture all phone and desktop screenshots in EN and PT-BR as above
- [ ] Approve (or replace) the app icon and maskable icon
- [ ] Produce the Google Play feature graphic
- [ ] Record the optional promo video / GIF
- [ ] Fill in the production URL and support e-mail in `en-US.md` and `pt-BR.md`
