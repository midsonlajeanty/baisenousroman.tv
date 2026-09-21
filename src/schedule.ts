import type { Video } from "./videos.ts";

export type Slot = {
  label: string;
  video: Video;
};

const SLOT_LABELS = ["Maintenant", "Ensuite", "Après"] as const;

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const order = [...items];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

export function programmeOrder(
  catalog: readonly Video[],
  watched: ReadonlySet<string>,
  random: () => number = Math.random,
): Video[] {
  const unseen = catalog.filter((video) => !watched.has(video.id));
  const seen = catalog.filter((video) => watched.has(video.id));
  return [...shuffle(unseen, random), ...shuffle(seen, random)];
}

export function markWatched(
  watched: ReadonlySet<string>,
  id: string,
  catalog: readonly Video[],
): Set<string> {
  const next = new Set(catalog.filter((video) => watched.has(video.id)).map((video) => video.id));
  next.add(id);
  const cycleComplete = catalog.every((video) => next.has(video.id));
  return cycleComplete ? new Set([id]) : next;
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
