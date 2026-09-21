# baisenousroman.tv

A fake TV channel that only broadcasts Roman Frayssinet. The visitor lands on a
video that is already playing; when it ends the next one starts, and the
programme loops forever.

The site is a static Vite + TypeScript page. Videos are played exclusively
through the official YouTube IFrame Player (`youtube-nocookie.com`): nothing is
downloaded, hosted, converted or proxied. It is not affiliated with Roman
Frayssinet.

## Development

```sh
vp install
vp dev
```

`vp check` formats, lints and type checks. `vp run build` type checks the app
and the scripts, then builds into `dist/`.

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
or show tags (`- CANAL+`, `- SF2`...) so only the sketch title is kept;
`vp test` covers it. The API key is only read by this script; the browser never sees it.

The `Sync YouTube catalog` workflow runs the same script twice a day, at 05:17 and 17:17
UTC and commits `videos.json` only when it changed. It needs two repository
secrets: `YOUTUBE_API_KEY` and `YOUTUBE_PLAYLIST_ID`.

## Playback

- The channel starts with sound. When the browser refuses autoplay with sound,
  it falls back to muted autoplay and turns the sound on at the visitor's
  first click or key press anywhere on the page.
- Captions are off by default; the captions button turns them on (French
  track first) and the choice is remembered.
- If even muted autoplay is refused, the screen asks the visitor to join the
  broadcast; if a tap still cannot start it, YouTube's own play button is
  exposed.
- Deleted, private or non-embeddable videos are skipped. When no video in the
  catalog can play, or the IFrame API does not load, the screen goes off air.
- Each visit shuffles the catalog into its own running order. Videos the
  visitor already watched (remembered in `localStorage`) go to the back, so
  nothing airs twice for them before the whole catalog has; the history
  resets once every video has been watched.

## Stats

`stats.baisenousroman.tv` shows the public Umami dashboard in a frame, inside a
page styled like the channel; `worker/index.ts` only maps the subdomain root to
`stats.html`. The official Umami image bakes `frame-ancestors 'self'` at build
time, so a Cloudflare Transform Rule (Modify Response Header, "Set static") on
`analytics.karakoapps.online/share/…` replaces its Content Security Policy with
one that allows `https://stats.baisenousroman.tv`. Regenerating the share link
means updating that rule and the frame URL in `stats.html`.

## Deployment

Cloudflare Workers static assets, built from the GitHub repository:

- Build command: `bun run build`
- Deploy command: `bunx wrangler deploy` (`npx` refuses the `devEngines`
  entry that pins bun)
- Build variable: `BUN_VERSION=1.4.2`, the version that wrote `bun.lock`

`wrangler.jsonc` serves `dist/`; its `name` must match the Worker name in the
Cloudflare dashboard. `public/_headers` sets the Content Security Policy
(YouTube scripts and frames only) and long-lived caching for hashed assets.
