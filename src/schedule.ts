import type { Video } from "./videos.ts";

export type Slot = {
  label: string;
  video: Video;
};

const SLOT_LABELS = ["Maintenant", "Ensuite", "Après"] as const;

export function shuffle<T>(
  items: readonly T[],
  avoidFirst?: (item: T) => boolean,
  random: () => number = Math.random,
): T[] {
  const order = [...items];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  if (avoidFirst && order.length > 1 && avoidFirst(order[0]!)) {
    order.push(order.shift()!);
  }
  return order;
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
