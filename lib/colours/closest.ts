import { normaliseHex } from "./hex";

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Weighted RGB distance ("redmean"); the same formula as closest_colours in the database.
export function colourDistance(a: string, b: string): number {
  const x = normaliseHex(a);
  const y = normaliseHex(b);
  if (!x || !y) return Number.POSITIVE_INFINITY;
  const [r1, g1, b1] = rgb(x);
  const [r2, g2, b2] = rgb(y);
  const mean = (r1 + r2) / 2;
  return (2 + mean / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - mean) / 256) * (b1 - b2) ** 2;
}

// The nearest shades to a colour from a list already in memory (used for the sample page and tests).
export function closestFrom<T extends { hex: string; name_ar: string }>(list: T[], hex: string, limit = 12): T[] {
  return [...list]
    .sort((p, q) => colourDistance(hex, p.hex) - colourDistance(hex, q.hex) || p.name_ar.localeCompare(q.name_ar, "ar"))
    .slice(0, Math.max(1, Math.min(limit, 60)));
}
