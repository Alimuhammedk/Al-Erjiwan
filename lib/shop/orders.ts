import { ar } from "@/content/ar";
import type { Messages } from "@/lib/i18n/types";
import type { Result } from "@/lib/admin/types";
import type { CartItem } from "@/lib/cart/cart";

type Errors = Messages["checkout"]["errors"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LINES = 50;

// What is sent to the server for each cart line. There is deliberately no price, total or fee here:
// the database looks every price up itself.
export type OrderItem = {
  product_id: string;
  variant_id: string | null;
  colour_id: string | null;
  colour_note: string | null;
  quantity: number;
};

export function cartToOrderItems(items: CartItem[]): OrderItem[] {
  return items.map((i) => ({
    product_id: i.product_id,
    variant_id: i.variant_id,
    colour_id: i.colour_id,
    colour_note: i.colour_note,
    quantity: i.quantity,
  }));
}

// Reads the cart lines posted by the checkout form. Anything unexpected is refused; unknown fields (such as a
// price a tampered browser might add) are dropped.
export function parseOrderItems(json: string, e: Errors = ar.checkout.errors): Result<OrderItem[]> {
  const fail = (message: string): Result<OrderItem[]> => ({ ok: false, errors: { items: message } });
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return fail(e.invalidItems);
  }
  if (!Array.isArray(data)) return fail(e.invalidItems);
  if (data.length === 0) return fail(e.emptyCart);
  if (data.length > MAX_LINES) return fail(e.invalidItems);

  const items: OrderItem[] = [];
  for (const raw of data) {
    const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const id = (v: unknown) => (v === null || v === undefined || v === "" ? null : typeof v === "string" && UUID.test(v) ? v : undefined);
    const quantity = typeof d.quantity === "number" ? d.quantity : typeof d.quantity === "string" && /^\d{1,3}$/.test(d.quantity) ? Number(d.quantity) : NaN;
    const note = d.colour_note === null || d.colour_note === undefined ? "" : typeof d.colour_note === "string" ? d.colour_note.trim() : undefined;
    const product_id = typeof d.product_id === "string" && UUID.test(d.product_id) ? d.product_id : undefined;
    const variant_id = id(d.variant_id);
    const colour_id = id(d.colour_id);

    if (!product_id || variant_id === undefined || colour_id === undefined) return fail(e.invalidItems);
    if (note === undefined || note.length > 100) return fail(e.invalidItems);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return fail(e.invalidItems);
    items.push({ product_id, variant_id, colour_id, colour_note: note || null, quantity });
  }
  return { ok: true, value: items };
}

// Turns an error code from the database into a message in the customer's language. Raw database text never
// reaches the screen.
export function orderErrorMessage(message: string, e: Errors = ar.checkout.errors): string {
  const m = /^([A-Z_]+)(?::(.*))?$/.exec(message.trim());
  const name = m?.[2] ?? "";
  switch (m?.[1]) {
    case "OUT_OF_STOCK":
      return e.outOfStock.replace("{name}", name);
    case "SIZE_REQUIRED":
      return e.size.replace("{name}", name);
    case "COLOUR_REQUIRED":
      return e.colour.replace("{name}", name);
    case "EMPTY_CART":
      return e.emptyCart;
    case "ZONE_INVALID":
      return e.zone;
    case "MIN_ORDER":
      return e.minOrder;
    case "PRODUCT_UNAVAILABLE":
      return e.unavailable;
    case "INVALID_INPUT":
      return e.invalid;
    default:
      return e.generic;
  }
}
