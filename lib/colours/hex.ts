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

// Dark text on light colours, white text on dark ones (by perceived brightness).
export function readableTextOn(hex: string): "#1a1a1a" | "#ffffff" {
  const n = normaliseHex(hex);
  if (!n) return "#1a1a1a";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? "#1a1a1a" : "#ffffff";
}
