# Study Log — Personal JEE Study Evidence Tracker (Vanilla JS + PWA)

Pure HTML, CSS, and JavaScript. No React, no npm, no build step. Tracks
proof of study — a day only counts once you've logged evidence.

## Running it — the simple way

Just double-click **`index.html`**. It opens in your browser and works
fully: adding sessions, photos, search, streak, everything. Data is saved
in your browser's `localStorage`, so it's still there next time you open
the same file in the same browser.

**One limitation of opening it this way:** browsers block "Add to Home
Screen" / installable-PWA behavior (and the offline service worker) for
pages opened directly from disk (`file://`). This is a browser security
rule, not something in this code — installability requires the page to
be served over `http://localhost` or `https://`. The tracker itself works
identically either way; only the "install as an app" part needs serving.

## Running it so it's installable on your Android home screen

Pick whichever is easiest for you:

### Option A — serve it from your own phone/computer, no internet needed
If you have Python installed on the same computer as the files:
```bash
cd study-tracker-vanilla
python3 -m http.server 8000
```
Then visit `http://localhost:8000` on that computer, or
`http://<your-computer's-local-IP>:8000` from your phone (same Wi-Fi).
Chrome on Android will offer **"Add to Home Screen"** — tap it, and the
app opens full-screen like a native app from then on, with the icon you
saw generated in `icons/`.

### Option B — host it for free so it works from anywhere
Drop the folder into any static host:
- [Netlify Drop](https://app.netlify.com/drop) — drag the folder in, get a
  URL instantly
- [GitHub Pages](https://pages.github.com/) — push to a repo, enable
  Pages
- [Vercel](https://vercel.com) — import the folder as a static project

Any of these serve over `https://`, so the install prompt and offline
support both work.

## Project structure

```
index.html          # page structure + PWA meta tags
style.css           # all styling (design tokens at the top)
manifest.json        # PWA manifest — name, icons, colors
sw.js                # service worker — offline app-shell caching
icons/
  icon-192.png
  icon-512.png
js/
  storage.js         # localStorage access — the ONLY file that touches storage
  date-utils.js       # date formatting/parsing helpers
  streak.js           # streak + total-day calculation
  app.js               # state, rendering, and all event handling
```

Scripts are loaded as plain `<script>` tags (not ES modules) specifically
so the app keeps working when opened directly via `file://` — modules are
blocked from loading each other under `file://` by browser CORS rules,
plain scripts aren't.

**Why it's organized this way:** every part of the UI only ever calls
functions on the global `Storage` object. If you later want real cloud
sync, you only need to rewrite `js/storage.js` — nothing else changes.

## Data model

Each session saved to `localStorage` (key: `study-evidence-tracker:sessions`)
looks like:

```js
{
  id: "uuid",
  date: "2026-07-26",
  createdAt: "2026-07-26T14:32:00.000Z",
  subject: "Chemistry",       // "Mathematics" | "Physics" | "Chemistry"
  chapter: "Ionic Equilibrium",
  explanation: "...",         // only set for Chemistry, otherwise null
  photos: [{ id, name, dataUrl }]
}
```

## Notes on your data

- Everything lives in `localStorage` in **that specific browser on that
  specific device**. Clearing browser data/cache erases it. It does not
  sync across devices or browsers on its own.
- `localStorage` has a practical size limit (commonly 5–10MB per site).
  Since photos are stored as base64 text, a few hundred photos over time
  could hit that ceiling — if saving ever fails, the app will tell you
  storage is full rather than silently losing data.
- Nothing is uploaded anywhere; there's no server involved in this
  version at all.

## What's deliberately not in this version

No hour tracking, no gamification, no badges beyond the plain streak
number, no motivational quotes, no analytics dashboards.

## Where future features would plug in

- **AI feedback** — a new `js/ai.js` reading a session's photos/explanation,
  called after save in `app.js`.
- **Revision reminders** — a scheduling module reading `date`/`chapter`
  from `Storage.getAll()`; notifications are a separate concern from storage.
- **Calendar view** — a new render function grouping `Storage.getAll()`
  results by `date` — no storage changes needed.
- **PDF export** — a function that takes the sessions array and renders it;
  another consumer of `Storage.getAll()`.
- **Statistics** — derived from the existing sessions array, same pattern
  as `Streak.compute()`.
- **Authentication / cloud storage** — replace `js/storage.js`'s functions
  with calls to a backend API instead of `localStorage`; nothing else in
  the app needs to change, since every screen only depends on that one
  module's function signatures.
