import "./styles.css";
import { createChannel, type OffAirReason } from "./player.ts";
import { markWatched, programmeOrder, startWith, upcoming } from "./schedule.ts";
import { loadCatalog } from "./videos.ts";

type ScreenState = "loading" | "blocked" | "direct" | "playing" | "offair";

const OFF_AIR_HINTS: Record<OffAirReason, string> = {
  empty: "LA GRILLE EST VIDE. PROFITEZ-EN POUR FUIR.",
  unreachable: "LE SIGNAL NE PASSE PAS. VOUS L'AVEZ ÉCHAPPÉ BELLE.",
  unplayable: "MÊME ROMAN NE VEUT PAS PASSER CE SOIR.",
};

const TUNE_IN_GRACE_MS = 1500;
const TOAST_MS = 2600;
const VIDEO_PARAM = "v";
const SITE_NAME = "BAISE NOUS ROMAN.TV";
const PROGRESS_INTERVAL_MS = 1000;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id} in index.html`);
  return element as T;
}

const frame = byId("frame");
const nowTitle = byId("now-title");
const idleTitle = byId("idle-title");
const idleHint = byId("idle-hint");
const tuneInButton = byId<HTMLButtonElement>("tune-in");
const soundButton = byId<HTMLButtonElement>("sound");
const zapButton = byId<HTMLButtonElement>("zap");
const playbackButton = byId<HTMLButtonElement>("playback");
const fullscreenButton = byId<HTMLButtonElement>("fullscreen");
const captionsButton = byId<HTMLButtonElement>("captions");
const shareButton = byId<HTMLButtonElement>("share");
const toast = byId("toast");
const controls = byId("controls");
const progressBar = byId("progress");
const scheduleList = byId<HTMLOListElement>("schedule");
const nav = byId("nav");

const clock = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

const WATCHED_KEY = "bnr:watched";

function readWatched(): Set<string> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(WATCHED_KEY) ?? "[]");
    return new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function saveWatched(ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(WATCHED_KEY, JSON.stringify([...ids]));
  } catch {}
}

const CAPTIONS_KEY = "bnr:captions";

function readCaptions(): boolean {
  try {
    return localStorage.getItem(CAPTIONS_KEY) === "on";
  } catch {
    return false;
  }
}

function saveCaptions(on: boolean): void {
  try {
    localStorage.setItem(CAPTIONS_KEY, on ? "on" : "off");
  } catch {}
}

let captionsOn = readCaptions();

const fullCatalog = loadCatalog();
let watched = readWatched();
const requestedVideo = new URLSearchParams(window.location.search).get(VIDEO_PARAM);
const catalog = startWith(programmeOrder(fullCatalog, watched), requestedVideo);
let current = 0;
let startedAt = Date.now();
let remainingMs: number | null = null;

function setState(state: ScreenState): void {
  frame.dataset.state = state;
}

function setPaused(paused: boolean): void {
  frame.dataset.paused = String(paused);
  const label = paused ? "Reprendre (espace)" : "Pause (espace)";
  playbackButton.setAttribute("aria-label", label);
  playbackButton.title = label;
}

function setMuted(muted: boolean): void {
  frame.dataset.muted = String(muted);
  const label = muted ? "Activer le son (M)" : "Couper le son (M)";
  soundButton.setAttribute("aria-label", label);
  soundButton.title = label;
}

function setCaptions(on: boolean): void {
  frame.dataset.captions = String(on);
  const label = on ? "Désactiver les sous-titres (C)" : "Activer les sous-titres (C)";
  captionsButton.setAttribute("aria-pressed", String(on));
  captionsButton.setAttribute("aria-label", label);
  captionsButton.title = label;
}

function renderSchedule(): void {
  if (catalog.length === 0) {
    const empty = document.createElement("li");
    empty.className = "programme__empty";
    empty.textContent = "Mire technique. Roman revient bientôt. Il revient toujours.";
    scheduleList.replaceChildren(empty);
    return;
  }

  const times = [
    clock.format(startedAt),
    remainingMs === null ? "bientôt" : clock.format(Date.now() + remainingMs),
    "vous serez encore là",
  ];

  scheduleList.replaceChildren(
    ...upcoming(catalog, current).map((slot, position) => {
      const item = document.createElement("li");
      item.className = position === 0 ? "slot slot--now" : "slot";

      const label = document.createElement("span");
      label.className = "slot__label";
      label.textContent = slot.label;

      const title = document.createElement("span");
      title.className = "slot__title";
      title.textContent = slot.video.title;

      const time = document.createElement("span");
      time.className = "slot__time";
      time.textContent = times[position] ?? "";

      item.append(label, title, time);
      return item;
    }),
  );
}

function showProgram(index: number): void {
  current = index;
  startedAt = Date.now();
  remainingMs = null;
  const { id, title } = catalog[index]!;
  const address = new URL(window.location.href);
  address.searchParams.set(VIDEO_PARAM, id);
  window.history.replaceState(null, "", address);
  nowTitle.textContent = title;
  idleTitle.textContent = title;
  progressBar.style.setProperty("--progress", "0");
  renderSchedule();
}

function renderStars(): void {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 46 }, () => {
    const star = document.createElement("span");
    star.className = "star";
    star.style.setProperty("--x", `${Math.round(random() * 98)}%`);
    star.style.setProperty("--y", `${Math.round(random() * 92)}%`);
    star.style.setProperty("--size", random() > 0.75 ? "3px" : "2px");
    star.style.setProperty("--dur", `${(2.5 + random() * 4).toFixed(1)}s`);
    star.style.setProperty("--delay", `${(random() * 5).toFixed(1)}s`);
    return star;
  });
  byId("stars").append(...stars);
}

function dimNavOnScroll(): void {
  let queued = false;
  const update = () => {
    queued = false;
    nav.classList.toggle("nav--dim", window.scrollY > window.innerHeight * 0.35);
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

renderStars();
dimNavOnScroll();
setMuted(true);
setPaused(false);
setCaptions(captionsOn);

if (catalog.length > 0) showProgram(current);
else renderSchedule();

const channel = createChannel(
  byId("player"),
  catalog,
  current,
  {
    onProgramChange(index) {
      setState("loading");
      idleHint.textContent = "RÉGLAGE DE L'ANTENNE";
      showProgram(index);
    },
    onPaused() {
      if (frame.dataset.state === "playing") setPaused(true);
    },
    onPlaying(muted) {
      setState("playing");
      setPaused(false);
      setMuted(muted);
      const video = catalog[current];
      if (video && !watched.has(video.id)) {
        watched = markWatched(watched, video.id, fullCatalog);
        saveWatched(watched);
      }
    },
    onNeedsStart() {
      setState("blocked");
      idleHint.textContent = "APPUYEZ POUR ALLUMER LA CHAÎNE";
    },
    onOffAir(reason) {
      setState("offair");
      nowTitle.textContent = "Hors antenne";
      idleTitle.textContent = "HORS ANTENNE";
      idleHint.textContent = OFF_AIR_HINTS[reason];
      progressBar.style.setProperty("--progress", "0");
    },
  },
  captionsOn,
);

function tuneIn(): void {
  channel.tuneIn();
  window.setTimeout(() => {
    if (frame.dataset.state === "blocked") setState("direct");
  }, TUNE_IN_GRACE_MS);
}

function toggleSound(): void {
  void channel.toggleSound().then((soundOn) => setMuted(!soundOn));
}

const isPhone = window.matchMedia("(pointer: coarse) and (max-width: 940px)");

async function enterFullscreen(): Promise<void> {
  await frame.requestFullscreen();
  if (isPhone.matches) await screen.orientation?.lock("landscape").catch(() => {});
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void enterFullscreen().catch(() => {});
}

frame.addEventListener("click", () => {
  const state = frame.dataset.state;
  if (state === "blocked") tuneIn();
  else if (state !== "playing") return;
  else if (frame.dataset.muted === "true") toggleSound();
  else channel.togglePlayback();
});

controls.addEventListener("click", (event) => event.stopPropagation());

let toastTimer: number | undefined;

function showToast(message: string): void {
  toast.textContent = message;
  frame.dataset.toast = "true";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    frame.dataset.toast = "false";
  }, TOAST_MS);
}

async function shareChannel(): Promise<void> {
  const video = catalog[current];
  const url = new URL("/", window.location.origin);
  if (video) url.searchParams.set(VIDEO_PARAM, video.id);
  const text = video
    ? `« ${video.title} » passe sur ${SITE_NAME}. Il va vous avoir aussi.`
    : `${SITE_NAME}, la chaîne qui ne diffuse que Roman Frayssinet.`;

  if (navigator.share) {
    try {
      await navigator.share({ title: SITE_NAME, text, url: url.href });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(url.href);
    showToast("Lien copié. À vous de les avoir.");
  } catch {
    showToast(url.href);
  }
}

function toggleCaptions(): void {
  captionsOn = !captionsOn;
  setCaptions(captionsOn);
  saveCaptions(captionsOn);
  channel.setCaptions(captionsOn);
}

const SHORTCUTS: Record<string, () => void> = {
  " ": () => channel.togglePlayback(),
  k: () => channel.togglePlayback(),
  m: toggleSound,
  f: toggleFullscreen,
  n: () => channel.zap(),
  c: toggleCaptions,
};

function shortcutFor(event: KeyboardEvent): (() => void) | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey) return undefined;
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]"))
    return undefined;
  if (event.key === " " && target instanceof HTMLButtonElement) return undefined;
  return SHORTCUTS[event.key.toLowerCase()];
}

document.addEventListener("keydown", (event) => {
  const action = shortcutFor(event);
  if (!action || frame.dataset.state !== "playing") return;
  event.preventDefault();
  action();
});

function unmuteOnFirstGesture(event: Event): void {
  if (frame.contains(event.target as Node)) return;
  if (event instanceof KeyboardEvent && shortcutFor(event)) return;
  if (frame.dataset.state !== "playing" || frame.dataset.muted !== "true") return;
  document.removeEventListener("pointerdown", unmuteOnFirstGesture);
  document.removeEventListener("keydown", unmuteOnFirstGesture);
  void channel.unmute().then(() => setMuted(false));
}

document.addEventListener("pointerdown", unmuteOnFirstGesture);
document.addEventListener("keydown", unmuteOnFirstGesture);
zapButton.addEventListener("click", () => channel.zap());
playbackButton.addEventListener("click", () => channel.togglePlayback());
soundButton.addEventListener("click", toggleSound);
captionsButton.addEventListener("click", toggleCaptions);
shareButton.addEventListener("click", () => void shareChannel());

fullscreenButton.hidden = !document.fullscreenEnabled;
fullscreenButton.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => {
  const active = document.fullscreenElement === frame;
  frame.dataset.fullscreen = String(active);
  if (!active) screen.orientation?.unlock();
  const label = active ? "Quitter le plein écran (F)" : "Plein écran (F)";
  fullscreenButton.setAttribute("aria-label", label);
  fullscreenButton.title = label;
});

tuneInButton.addEventListener("click", (event) => {
  event.stopPropagation();
  tuneIn();
});

window.setInterval(() => {
  if (frame.dataset.state !== "playing" || document.hidden) return;
  void channel.timing().then(({ current: position, duration }) => {
    if (duration <= 0) return;
    progressBar.style.setProperty("--progress", String(Math.min(position / duration, 1)));
    const next = Math.max(duration - position, 0) * 1000;
    const wasUnknown = remainingMs === null;
    remainingMs = next;
    if (wasUnknown) {
      startedAt = Date.now() - position * 1000;
      renderSchedule();
    }
  });
}, PROGRESS_INTERVAL_MS);
