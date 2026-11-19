// What the customer picked, saved in their browser. Prices here are for display only:
// checkout (phase 5) re-reads real prices from the database.
export type CartItem = {
  key: string;
  product_id: string;
  variant_id: string | null;
  colour_id: string | null;
  colour_name: string | null; // shown in the cart; checkout re-reads the colour from the database
  colour_note: string | null;
  name: string;
  size_label: string | null;
  unit_price: number;
  image_url: string | null;
  quantity: number;
};

export const MAX_QTY = 99;

const clamp = (n: number) => (Number.isFinite(n) ? Math.min(MAX_QTY, Math.max(1, Math.floor(n))) : 1);

export function cartKey(i: Pick<CartItem, "product_id" | "variant_id" | "colour_id" | "colour_note">): string {
  return JSON.stringify([i.product_id, i.variant_id, i.colour_id, i.colour_note]);
}

export function addItem(cart: CartItem[], item: Omit<CartItem, "key">): CartItem[] {
  const key = cartKey(item);
  const found = cart.find((c) => c.key === key);
  if (!found) return [...cart, { ...item, key, quantity: clamp(item.quantity) }];
  return cart.map((c) => (c.key === key ? { ...c, quantity: clamp(c.quantity + item.quantity) } : c));
}

export function setQuantity(cart: CartItem[], key: string, quantity: number): CartItem[] {
  return cart.map((c) => (c.key === key ? { ...c, quantity: clamp(quantity) } : c));
}

export function removeItem(cart: CartItem[], key: string): CartItem[] {
  return cart.filter((c) => c.key !== key);
}

export const cartCount = (cart: CartItem[]) => cart.reduce((n, c) => n + c.quantity, 0);
export const cartTotal = (cart: CartItem[]) => cart.reduce((n, c) => n + c.unit_price * c.quantity, 0);

const str = (v: unknown): v is string => typeof v === "string";
const strOrNull = (v: unknown): v is string | null => v === null || typeof v === "string";

// Anything unexpected in stored data is dropped so a bad value can never break the site.
export function parseCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const items: CartItem[] = [];
  for (const d of data as Record<string, unknown>[]) {
    if (
      !d ||
      !str(d.product_id) ||
      !strOrNull(d.variant_id) ||
      !strOrNull(d.colour_id) ||
      !strOrNull(d.colour_note) ||
      !str(d.name) ||
      !strOrNull(d.size_label) ||
      !strOrNull(d.image_url) ||
      typeof d.unit_price !== "number" ||
      !Number.isFinite(d.unit_price) ||
      d.unit_price < 0 ||
      typeof d.quantity !== "number"
    ) {
      continue;
    }
    const item = {
      product_id: d.product_id,
      variant_id: d.variant_id,
      colour_id: d.colour_id,
      colour_name: typeof d.colour_name === "string" ? d.colour_name : null, // older saved carts have none
      colour_note: d.colour_note,
      name: d.name,
      size_label: d.size_label,
      unit_price: d.unit_price,
      image_url: d.image_url,
      quantity: clamp(d.quantity),
    };
    items.push({ ...item, key: cartKey(item) });
  }
  return items;
}
