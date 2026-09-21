import "./styles.css";
import { createChannel, type OffAirReason } from "./player.ts";
import { shuffle, upcoming } from "./schedule.ts";
import { loadCatalog } from "./videos.ts";

type ScreenState = "loading" | "blocked" | "direct" | "playing" | "offair";

const OFF_AIR_HINTS: Record<OffAirReason, string> = {
  empty: "LA GRILLE EST VIDE. PROFITEZ-EN POUR FUIR.",
  unreachable: "LE SIGNAL NE PASSE PAS. VOUS L'AVEZ ÉCHAPPÉ BELLE.",
  unplayable: "MÊME ROMAN NE VEUT PAS PASSER CE SOIR.",
};

const TUNE_IN_GRACE_MS = 1500;
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
const progressBar = byId("progress");
const scheduleList = byId<HTMLOListElement>("schedule");
const nav = byId("nav");

const clock = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

const LAST_OPENING_KEY = "bnr:last-opening";

function readLastOpening(): string | null {
  try {
    return localStorage.getItem(LAST_OPENING_KEY);
  } catch {
    return null;
  }
}

function saveOpening(id: string): void {
  try {
    localStorage.setItem(LAST_OPENING_KEY, id);
  } catch {}
}

const lastOpening = readLastOpening();
const catalog = shuffle(loadCatalog(), (video) => video.id === lastOpening);
if (catalog[0]) saveOpening(catalog[0].id);
let current = 0;
let startedAt = Date.now();
let remainingMs: number | null = null;

function setState(state: ScreenState): void {
  frame.dataset.state = state;
}

function setMuted(muted: boolean): void {
  frame.dataset.muted = String(muted);
  soundButton.textContent = muted ? "ACTIVER LE SON" : "COUPER LE SON";
  soundButton.setAttribute("aria-pressed", String(!muted));
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
  const { title } = catalog[index]!;
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

if (catalog.length > 0) showProgram(current);
else renderSchedule();

const channel = createChannel(byId("player"), catalog, current, {
  onProgramChange(index) {
    setState("loading");
    idleHint.textContent = "RÉGLAGE DE L'ANTENNE";
    showProgram(index);
  },
  onPlaying(muted) {
    setState("playing");
    setMuted(muted);
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
});

function tuneIn(): void {
  channel.tuneIn();
  window.setTimeout(() => {
    if (frame.dataset.state === "blocked") setState("direct");
  }, TUNE_IN_GRACE_MS);
}

frame.addEventListener("click", (event) => {
  const state = frame.dataset.state;
  if (state === "blocked") {
    tuneIn();
  } else if (state === "playing" && event.target !== soundButton) {
    void channel.toggleSound().then((soundOn) => setMuted(!soundOn));
  }
});

tuneInButton.addEventListener("click", (event) => {
  event.stopPropagation();
  tuneIn();
});

soundButton.addEventListener("click", () => {
  void channel.toggleSound().then((soundOn) => setMuted(!soundOn));
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
