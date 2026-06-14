# Thirteen — Scorecard (PWA)

An installable phone app for scoring **13**, the card game where a
different rank is wild each round (A → K, plus jokers always),
and the lowest total after 13 rounds wins. Each round's high scorer deals
the next round.

It's a Progressive Web App — a normal website that, once added to your home
screen, launches fullscreen and works completely offline. No app store, no
account, no data leaves the phone (scores live in the browser's local
storage on each device).

---

## Run it locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install      # install dependencies (first time only)
npm run dev      # start the dev server, then open the printed localhost URL
```

To make a production build:

```bash
npm run build    # outputs to dist/
npm run preview  # serve the built dist/ locally to test it
```

---

## Put it online (free)

You need it hosted over HTTPS for the "install" / offline features to work.
Any of these work; **Vercel** is the least friction.

### Option A — Vercel
1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com), "Add New → Project", import the repo.
3. Vercel auto-detects Vite. Leave defaults (build `npm run build`, output `dist`).
4. Deploy. You get a `https://your-app.vercel.app` URL.

Or from this folder without GitHub: `npx vercel` and follow the prompts.

### Option B — Netlify
1. Push to GitHub, then [netlify.com](https://netlify.com) → "Add new site → Import".
2. Build command `npm run build`, publish directory `dist`.

Or drag-and-drop: run `npm run build`, then drop the `dist/` folder onto
[app.netlify.com/drop](https://app.netlify.com/drop).

### Option C — GitHub Pages
Pages serves from a sub-path (`/your-repo/`), so set that base first:
1. In `vite.config.js`, change `base: "/"` to `base: "/your-repo-name/"`.
2. `npm run build`, then publish the `dist/` folder to the `gh-pages` branch
   (e.g. with the `gh-pages` npm package or an Actions workflow).

---

## Install it on your phone

Once it's live at an HTTPS URL:

**iPhone (Safari)** — open the URL → tap the Share button → **Add to Home
Screen**. Launches fullscreen, works offline.

**Android (Chrome)** — open the URL → menu (⋮) → **Install app** (or "Add to
Home screen"). You may also get an automatic install prompt.

The icon, name ("Thirteen"), and dark theme color all come from the web
manifest and are already configured.

---

## Notes

- **Where scores live:** the in-progress game is saved in `localStorage`,
  so it survives closing the app — but it's per-device and per-browser. It is
  not synced between phones. (If you ever want shared/live scoring across
  devices, that needs a small backend — happy to add one.)
- **Offline fonts:** the three fonts (Fraunces, Archivo, DM Mono) are pulled
  from Google Fonts and cached by the service worker on first load, so the app
  styles correctly offline afterward.
- **Regenerating icons:** edit and re-run `python3 gen_icons.py` (needs
  Python + Pillow). It writes the PNGs into `public/`.

## Project layout

```
index.html            app shell, meta tags
vite.config.js        Vite + PWA plugin (manifest, service worker, caching)
gen_icons.py          regenerates the app icons
public/               favicon, app icons
src/
  main.jsx            entry point, registers the service worker
  App.jsx             the entire scorecard
  index.css           global resets, dark background, safe-area padding
```
