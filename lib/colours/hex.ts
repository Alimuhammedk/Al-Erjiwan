// Small colour helpers: reading hex codes, converting from the wheel, and picking readable label colours.

// "#abc", "ABC", "#AABBCC" (also with Arabic digits) all become "#aabbcc". Anything else is null.
export function normaliseHex(input: string): string | null {
  const digits = input
    .trim()
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(digits);
  if (!m) return null;
  const h = m[1].toLowerCase();
  return "#" + (h.length === 3 ? [...h].map((c) => c + c).join("") : h);
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// h in degrees (any number), s and l from 0 to 100.
export function hslToHex(h: number, s: number, l: number): string {
  const hue = Number.isFinite(h) ? ((h % 360) + 360) % 360 : 0;
  const sat = clamp(Number.isFinite(s) ? s : 0, 0, 100) / 100;
  const lig = clamp(Number.isFinite(l) ? l : 0, 0, 100) / 100;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(clamp(x, 0, 1) * 255).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const n = normaliseHex(hex);
  if (!n) return null;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Dark text on light colours, white text on dark ones (by perceived brightness).
export function readableTextOn(hex: string): "#1a1a1a" | "#ffffff" {
  const n = normaliseHex(hex);
  if (!n) return "#1a1a1a";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? "#1a1a1a" : "#ffffff";
}
