# Deploying Operation Vault

## The one thing that will break

This is a single-page app using `BrowserRouter`, so `/vault`, `/leaderboard`
and every other route exist **only in the browser**. A static host asked for
`/vault` looks for a file called `vault`, does not find one, and returns 404.

You see it on a hard reload, or when someone opens a link cold — which is
exactly what happens when a phone reloads mid-event. It does **not** happen on
`npm run dev`, because the Vite dev server fakes the fallback. That is why it
looked like a mobile-only bug: desktop was on the dev server, the phone was on
the deployed build.

The fix is one rewrite rule: **serve `index.html` for any path that is not a
real file, with status 200** (not a redirect — the router has to see the
original URL).

Three configs ship in this repo so it is already handled on the common hosts.
Each is ignored by hosts that do not read it, so they can all coexist:

| Host | Handled by | Notes |
|---|---|---|
| Netlify | `public/_redirects` | copied to `dist/` at build |
| Cloudflare Pages | `public/_redirects` | same file |
| Vercel | `vercel.json` | repo root |
| GitHub Pages | `dist/404.html` | emitted by a plugin in `vite.config.ts` |
| Render (static) | `dist/404.html` | or set a rewrite `/*` → `/index.html` |

### Anything else

If you deploy somewhere not in that table, add the equivalent rule:

- **nginx** — `try_files $uri $uri/ /index.html;`
- **Apache** — `FallbackResource /index.html`
- **Firebase** — `"rewrites": [{ "source": "**", "destination": "/index.html" }]`
- **S3 + CloudFront** — set the error document to `index.html` and map 403/404
  to `/index.html` with response code 200

### If the host cannot be configured at all

Switch to a hash router. One line in `src/App.tsx`:

```ts
import { HashRouter as Router } from "react-router-dom";
```

URLs become `/#/vault`. Uglier, and the QR code and the projector URL change
with it — but it needs no server configuration anywhere, ever. Worth doing if
the deploy target is uncertain on the day.

## Verifying before the event

Do not test with `npm run dev` — it will pass regardless. Build and serve the
real output:

```bash
npm run build
npx vite preview          # or any static server pointed at dist/
```

Then load `/vault` **directly** in the address bar and reload it. If that
works, reloads work.

## Routes

| Route | Who |
|---|---|
| `/` | players — splash, QR lands here |
| `/admin` | operator sign-in (demo code `801422`, checked in-browser, protects nothing) |
| `/admin/display` | the hall projector — intentionally not behind the gate |
| `/safes`, `/assets` | dev reference pages; remove before the event |
