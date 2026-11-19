// shortcut: one coverage value for all paints (real coverage differs by product), store it per product when Ali asks.
export const COVERAGE_M2_PER_LITRE = 10;
const DOOR_M2 = 2;
const WINDOW_M2 = 1.5;

type Priced = { base_price: number; sale_price: number | null };

// A chosen size uses its own price and no sale; otherwise a sale price below the base price wins.
export function displayPrice(p: Priced, v?: { price: number } | null): { price: number; oldPrice: number | null } {
  if (v) return { price: v.price, oldPrice: null };
  if (p.sale_price !== null && p.sale_price < p.base_price) return { price: p.sale_price, oldPrice: p.base_price };
  return { price: p.base_price, oldPrice: null };
}

export function stockFor(p: { stock: number }, v?: { stock: number } | null): number {
  return v ? v.stock : p.stock;
}

export function isSoldOut(p: { stock: number }, variants: { stock: number }[], selected?: { stock: number } | null): boolean {
  if (variants.length === 0) return p.stock <= 0;
  if (selected) return selected.stock <= 0;
  return variants.every((v) => v.stock <= 0);
}

type Room = { length: number; width: number; height: number; doors: number; windows: number; coats: number };

// Whole litres, rounded up, or null when the numbers can't make sense.
export function estimateLitres(r: Room): number | null {
  const nums = [r.length, r.width, r.height, r.doors, r.windows, r.coats];
  if (!nums.every(Number.isFinite)) return null;
  if (r.length <= 0 || r.width <= 0 || r.height <= 0 || r.doors < 0 || r.windows < 0) return null;
  if (r.coats < 1 || r.coats > 4) return null;

  const walls = 2 * (r.length + r.width) * r.height - r.doors * DOOR_M2 - r.windows * WINDOW_M2;
  if (walls <= 0) return null;
  return Math.ceil((walls * r.coats) / COVERAGE_M2_PER_LITRE);
}

// Whole percent saved, or null when there is no real discount (never a "0%" badge).
export function discountPercent(base: number, sale: number | null): number | null {
  if (sale === null || base <= 0 || sale >= base) return null;
  const pct = Math.round(((base - sale) / base) * 100);
  return pct >= 1 ? pct : null;
}
