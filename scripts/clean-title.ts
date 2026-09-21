const NOISE = /^(canal\+|clique|spectacle complet|officiel|official|extrait)$/i;
const ACRONYM = /^[A-Z0-9]{2,4}$/;

const TRAILING_SEGMENT = /\s+[-–—|]\s+([^-–—|]+)$/;
const LEADING_NAME = /^roman frayssinet\s*[-–—|:,]\s*/i;
const TRAILING_NAME = /\s+[-–—|]\s+roman frayssinet$/i;
const NAME_AS_SUBJECT = /^roman frayssinet\s+/i;

function isNoise(segment: string): boolean {
  return NOISE.test(segment) || ACRONYM.test(segment);
}

function dropTrailingNoise(title: string): string {
  let match = TRAILING_SEGMENT.exec(title);
  while (match && isNoise(match[1]!.trim())) {
    title = title.slice(0, match.index);
    match = TRAILING_SEGMENT.exec(title);
  }
  return title;
}

function sentenceCase(title: string): string {
  const letters = title.replace(/[^\p{L}]/gu, "");
  const shouting = letters.length > 1 && letters === letters.toUpperCase();
  const text = shouting ? title.toLowerCase() : title;
  return text.replace(/\p{L}/u, (first) => first.toUpperCase());
}

export function cleanTitle(raw: string): string {
  let title = dropTrailingNoise(raw.trim());
  title = title.replace(TRAILING_NAME, "");
  title = title.replace(LEADING_NAME, "").replace(NAME_AS_SUBJECT, "Roman ");
  title = dropTrailingNoise(title);
  title = title.replace(/^spectacle\s+/i, "");
  title = title.replace(/^"([^"]+)"$/, "$1").trim();

  if (!title || isNoise(title) || title.toLowerCase() === "roman frayssinet") return raw;
  return sentenceCase(title);
}
