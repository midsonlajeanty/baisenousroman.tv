import type { Video } from "./videos.ts";

export type Slot = {
  label: string;
  video: Video;
};

const SLOT_LABELS = ["Maintenant", "Ensuite", "Après"] as const;

// Visitors join the rotation at a point that moves every half hour, so the
// channel does not always open on the first video of the playlist.
const ROTATION_STEP_MS = 30 * 60 * 1000;

export function startIndex(catalogSize: number, now: number = Date.now()): number {
  if (catalogSize === 0) return 0;
  return Math.floor(now / ROTATION_STEP_MS) % catalogSize;
}

export function nextIndex(index: number, catalogSize: number): number {
  return catalogSize === 0 ? 0 : (index + 1) % catalogSize;
}

export function upcoming(catalog: readonly Video[], index: number): Slot[] {
  const count = Math.min(SLOT_LABELS.length, catalog.length);
  return SLOT_LABELS.slice(0, count).map((label, offset) => ({
    label,
    video: catalog[(index + offset) % catalog.length]!,
  }));
}
