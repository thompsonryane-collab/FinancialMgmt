# Thompson Finances

A single-file household balance-sheet app for iPhone 14+. Seven accounts, seven
panning screens, xlsx/csv/PDF statement intake, family spending breakdowns, and
an assistant (ARIA) that answers from your own numbers.

Everything is one file: `index.html`. No build step, no server code, no database.

## Deploy

### Netlify / Vercel / Cloudflare Pages (works with a private repo, free)
1. Push this repo to GitHub (private is fine).
2. In the host's dashboard: **New project → import the repo**.
3. Framework preset: **none / static**. Build command: *(leave empty)*. Output directory: `/` (root).
4. Deploy. The site is live at the URL they give you.

### GitHub Pages (repo must be public on the free plan)
1. Repo → **Settings → Pages**.
2. Source: **Deploy from a branch** → `main` → `/ (root)` → Save.
3. Live at `https://<user>.github.io/<repo>/` in about a minute.

## Install on the iPhone
Open the site in Safari → Share → **Add to Home Screen**. It launches full-screen
with the dark status bar and behaves like an app.

## Where the data lives
- Statements are parsed **in the browser on the phone**. Files are never uploaded anywhere.
- Parsed rows, balances, and ownership rules persist in the browser's localStorage
  on the device. Clearing Safari website data clears the ledger.
- Account numbers (full, partial, `****1234`, "ending in 1234", long digit runs)
  are scrubbed to `▓▓▓▓` at import, before anything is stored.
- ARIA in **Guest** mode is fully local. In **API key** mode it sends a compact
  summary (balances, monthly totals, scrubbed recent lines — never raw files) to
  the Anthropic API. The key lives in memory for the session only.

## What needs the network
Three CDN libraries: SheetJS (xlsx), pdf.js (loaded lazily on the first PDF),
and Google Fonts. Your data never goes up; only libraries come down.

## Cautions
- Don't commit statements, exports, or API keys to this repo. `.gitignore` covers
  the obvious file types, but the habit matters more than the file.
- A published site URL is public even when the repo is private. The app ships
  empty, so that's acceptable — but treat the URL like you'd treat the app.
- The browser-direct Anthropic API call is meant for personal use on your own
  devices, not for a site you share with others.

## Layout
- `index.html` — the entire app
- `favicon.ico`, `favicon-16.png`, `favicon-32.png` — browser tab icons (Tf crest)
- `apple-touch-icon.png` — the Home Screen icon iOS uses on Add to Home Screen
- `icon-192.png`, `icon-512.png` — larger crest renders, ready if we add a PWA manifest later
- `README.md` — this file
