export type Video = {
  id: string;
  title: string;
};

// A glob instead of a static import so the site still builds, and shows the
// off-air screen, before the first catalog sync has produced the file.
const catalogFiles = import.meta.glob<unknown>("./data/videos.json", {
  eager: true,
  import: "default",
});

function isVideo(value: unknown): value is Video {
  if (typeof value !== "object" || value === null) return false;
  const { id, title } = value as Record<string, unknown>;
  return typeof id === "string" && id.length > 0 && typeof title === "string";
}

export function loadCatalog(): Video[] {
  const raw = catalogFiles["./data/videos.json"];
  if (!Array.isArray(raw)) return [];
  return raw.filter(isVideo);
}
