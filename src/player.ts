import YouTubePlayer from "youtube-player";
import type { Video } from "./videos.ts";
import { nextIndex } from "./schedule.ts";

const ENDED = 0;
const PLAYING = 1;
const UNPLAYABLE_ERRORS = new Set([2, 5, 100, 101, 150]);

const AUTOPLAY_GRACE_MS = 4000;
const API_TIMEOUT_MS = 15000;

export type OffAirReason = "empty" | "unreachable" | "unplayable";

export type ChannelEvents = {
  onProgramChange: (index: number) => void;
  onPlaying: (muted: boolean) => void;
  onNeedsStart: () => void;
  onOffAir: (reason: OffAirReason) => void;
};

export type Timing = {
  current: number;
  duration: number;
};

export type Channel = {
  tuneIn: () => void;
  zap: () => void;
  toggleSound: () => Promise<boolean>;
  timing: () => Promise<Timing>;
};

export function createChannel(
  element: HTMLElement,
  catalog: readonly Video[],
  firstIndex: number,
  events: ChannelEvents,
): Channel {
  if (catalog.length === 0) {
    events.onOffAir("empty");
    return {
      tuneIn: () => {},
      zap: () => {},
      toggleSound: async () => false,
      timing: async () => ({ current: 0, duration: 0 }),
    };
  }

  let index = firstIndex;
  let failuresInARow = 0;
  let ready = false;
  let autoplayTimer: number | undefined;

  const player = YouTubePlayer(element, {
    host: "https://www.youtube-nocookie.com",
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      playsinline: 1,
      rel: 0,
    },
  });

  const apiTimer = window.setTimeout(() => {
    if (!ready) events.onOffAir("unreachable");
  }, API_TIMEOUT_MS);

  function broadcast(target: number): void {
    index = target;
    events.onProgramChange(index);
    void player.loadVideoById(catalog[index]!.id);
    window.clearTimeout(autoplayTimer);
    autoplayTimer = window.setTimeout(events.onNeedsStart, AUTOPLAY_GRACE_MS);
  }

  function skip(): void {
    failuresInARow += 1;
    if (failuresInARow >= catalog.length) {
      window.clearTimeout(autoplayTimer);
      events.onOffAir("unplayable");
      return;
    }
    broadcast(nextIndex(index, catalog.length));
  }

  player.on("ready", () => {
    ready = true;
    window.clearTimeout(apiTimer);
    void player.getIframe().then((iframe) => {
      iframe.title = "Diffusion";
    });
    void player.mute().then(() => broadcast(index));
  });

  player.on("stateChange", (event) => {
    if (event.data === PLAYING) {
      failuresInARow = 0;
      window.clearTimeout(autoplayTimer);
      void player.isMuted().then(events.onPlaying);
    } else if (event.data === ENDED) {
      broadcast(nextIndex(index, catalog.length));
    }
  });

  player.on("error", (event) => {
    const code = (event as CustomEvent & { data: number }).data;
    if (UNPLAYABLE_ERRORS.has(code)) skip();
  });

  return {
    tuneIn() {
      void player.unMute();
      void player.playVideo();
    },
    zap() {
      broadcast(nextIndex(index, catalog.length));
    },
    async toggleSound() {
      const muted = await player.isMuted();
      await (muted ? player.unMute() : player.mute());
      return muted;
    },
    async timing() {
      const [current, duration] = await Promise.all([
        player.getCurrentTime(),
        player.getDuration(),
      ]);
      return { current, duration };
    },
  };
}
