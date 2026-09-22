# baisenousroman.tv

A fake TV channel that only broadcasts Roman Frayssinet. The visitor lands on a
video that is already playing; when it ends the next one starts, and the
programme loops forever.

The site is a static Vite + TypeScript page. Videos are played exclusively
through the official YouTube IFrame Player (`youtube-nocookie.com`): nothing is
downloaded, hosted, converted or proxied. It is not affiliated with Roman
Frayssinet.

Live at [baisenousroman.tv](https://baisenousroman.tv), stats at
[baisenousroman.tv/stats](https://baisenousroman.tv/stats).

## Development

```sh
vp install
vp dev
```

| Command        | What it does                                                  |
| -------------- | ------------------------------------------------------------- |
| `vp run check` | Format, lint and type check                                   |
| `vp run test`  | Unit tests (title cleaning, programme order, worker routing)  |
| `vp run build` | Type check the app, the scripts and the worker, build `dist/` |
| `vp run sync`  | Refresh `src/data/videos.json` from the YouTube playlist      |

The `CI` workflow runs check, test and build on every pull request and every
push to `main`.

## Pages

| Page                | Source                  |
| ------------------- | ----------------------- |
| `/`                 | `index.html`            |
| `/stats`            | `stats.html`            |
| `/mentions-legales` | `mentions-legales.html` |
| any unknown path    | `404.html`, status 404  |

All pages share `src/styles.css`. Fonts (Climate Crisis, Instrument Sans) are
self-hosted in `public/fonts` and preloaded, so the hero title does not reflow
when they arrive.

## Catalog

`src/data/videos.json` holds the programme as `{ id, title }` pairs, in
playlist order. It is generated, never edited by hand:

```sh
cp .env.example .env   # fill in YOUTUBE_API_KEY and YOUTUBE_PLAYLIST_ID
vp run sync
```

`scripts/sync-youtube.ts` pages through the YouTube Data API, drops private
and deleted entries, and refuses to overwrite the catalog with an empty
playlist. `scripts/clean-title.ts` strips the artist name and the broadcaster
or show tags (`- CANAL+`, `- SF2`...) so only the sketch title is kept. The API
key is only read by this script; the browser never sees it.

The `Sync YouTube catalog` workflow runs the same script twice a day, at 05:17
and 17:17 UTC. When the catalog changed it opens a pull request and merges it
itself, since `main` is protected, then posts the new titles to Discord. A
failed sync is reported to Discord too. Repository secrets:

| Secret                | Used for                                  |
| --------------------- | ----------------------------------------- |
| `YOUTUBE_API_KEY`     | YouTube Data API v3 key                   |
| `YOUTUBE_PLAYLIST_ID` | The playlist that feeds the programme     |
| `DISCORD_WEBHOOK_URL` | New videos and failed syncs notifications |

Anyone with the collaboration link on the page can add a video to the playlist;
it airs after the next sync.

## Playback

- The channel starts with sound. When the browser refuses autoplay with sound,
  it falls back to muted autoplay, shows a "sound off" hint and turns the sound
  on at the visitor's first click or key press anywhere on the page.
- If even muted autoplay is refused, the screen asks the visitor to start it;
  if a tap still cannot start it, YouTube's own play button is exposed.
- Deleted, private or non-embeddable videos are skipped. When no video in the
  catalog can play, or the IFrame API does not load, the screen shows an empty
  state instead.
- Each visit shuffles the catalog into its own running order. Videos the
  visitor already watched (remembered in `localStorage`) go to the back, so
  nothing airs twice for them before the whole catalog has; the history
  resets once every video has been watched.
- The address follows the current video (`?v=<id>`), so a shared link opens on
  the same sketch.
- On a phone, turning the screen to landscape makes the player fill it; the
  fullscreen button also locks landscape where the browser allows it (Android).

### Controls

| Control    | Shortcut     | Notes                                          |
| ---------- | ------------ | ---------------------------------------------- |
| Pause      | `Space`, `K` | Clicking the video also pauses or resumes      |
| Zap        | `N`          | Next video in the visitor's order              |
| Sound      | `M`          |                                                |
| Captions   | `C`          | Off by default, French track first, remembered |
| Share      | `S`          | Native share sheet, or copies the link         |
| Fullscreen | `F`          | Hidden where the browser has no Fullscreen API |

While paused, a veil hides YouTube's own play button so only one is visible.

## Stats

The stats page shows the public Umami dashboard in a frame, inside a page styled
like the channel. It answers on `baisenousroman.tv/stats` (canonical, listed in
the sitemap) and on `stats.baisenousroman.tv`, where `worker/index.ts` maps the
root to `stats.html`.

The official Umami image bakes `frame-ancestors 'self'` at build time, so a
Cloudflare Transform Rule (Modify Response Header, "Set static") on
`analytics.karakoapps.online/share/…` replaces its Content Security Policy with
one that lists the domains allowed to frame it. Regenerating the share link
means updating that rule and the frame URL in `stats.html`.

## Deployment

Cloudflare Workers static assets, built from the GitHub repository on every
push to `main`:

- Build command: `bun run build`
- Deploy command: `bunx wrangler deploy` (`npx` refuses the `devEngines`
  entry that pins bun)
- Build variable: `BUN_VERSION=1.4.2`, the version that wrote `bun.lock`

`wrangler.jsonc` serves `dist/` on `baisenousroman.tv` and
`stats.baisenousroman.tv` only (`workers.dev` and preview URLs are off), runs
the worker for `/` alone and serves `404.html` for unknown paths.
`public/_headers` sets the Content Security Policy and long-lived caching for
hashed assets and fonts.

## Repository

- `main` is protected by a ruleset: no deletion, no force push, changes go
  through a pull request. Only the repository admin bypasses it.
- Dependabot checks bun packages and GitHub Actions every week.
- The code has no comments by choice; the reasoning lives in this README and in
  the commit history.
