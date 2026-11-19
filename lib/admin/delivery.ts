import { ar } from "@/content/ar";
import { normalisePhone } from "@/lib/shop/checkout";
import type { Result } from "./types";

// Delivery companies and fees: reading prices and checking what the owner types.

type Zone = { governorate_ar: string };
export type PriceRow = { price: number | string; delivery_zones: Zone | Zone[] | null };

// What a company charges for one governorate; null when it has no price for it.
export function priceForGovernorate(rows: PriceRow[] | null | undefined, governorate: string): number | null {
  for (const r of rows ?? []) {
    const zone = Array.isArray(r.delivery_zones) ? r.delivery_zones[0] : r.delivery_zones;
    if (zone?.governorate_ar === governorate) return Number(r.price);
  }
  return null;
}

// A company as the order page offers it: its price for that order's governorate (null = none).
export type CompanyOption = { id: string; name: string; whatsapp: string; price: number | null };

// ---- What the owner types in the delivery tabs ----

type Raw = Record<string, FormDataEntryValue | null | undefined>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: Raw[string]) => (typeof v === "string" ? v.trim() : "");
const ids = (raw: Raw) => str(raw.ids).split(",").map((s) => s.trim()).filter((s) => UUID.test(s));

// A whole-dinar amount typed in any common way. Blank is fine when the field is optional; anything else wrong is null.
function amount(input: string): number | null {
  const digits = input
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[,٬\s]/g, "");
  return /^\d{1,12}$/.test(digits) ? Number(digits) : null;
}

export type FeeRow = { id: string; fee: number; min_order: number; is_active: boolean };

// One save for every governorate: fee, minimum order and on/off. A blank fee or minimum means 0.
export function validateFees(raw: Raw): Result<FeeRow[]> {
  const errors: Record<string, string> = {};
  const rows: FeeRow[] = [];
  for (const id of ids(raw)) {
    const read = (key: string) => {
      const v = str(raw[`${key}_${id}`]);
      if (!v) return 0;
      const n = amount(v);
      if (n === null) errors[`${key}_${id}`] = ar.admin.delivery.invalidAmount;
      return n ?? 0;
    };
    rows.push({ id, fee: read("fee"), min_order: read("min"), is_active: raw[`active_${id}`] === "on" });
  }
  if (rows.length === 0) return { ok: false, errors: { form: ar.admin.errors.saveFailed } };
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: rows };
}

export type CompanyInput = {
  name: string;
  whatsapp: string;
  notes: string | null;
  is_active: boolean;
  prices: { zone_id: string; price: number }[];
};

// A company and its price list (one price per governorate; a blank price means "no price" and is not saved).
export function validateCompany(raw: Raw): Result<CompanyInput> {
  const e = ar.admin.delivery.errors;
  const errors: Record<string, string> = {};

  const name = str(raw.name);
  if (name.length < 2) errors.name = e.name;
  else if (name.length > 100) errors.name = ar.admin.errors.tooLong;

  const whatsapp = normalisePhone(str(raw.whatsapp));
  if (!whatsapp) errors.whatsapp = e.whatsapp;

  const notes = str(raw.notes);
  if (notes.length > 1000) errors.notes = ar.admin.errors.tooLong;

  const prices: CompanyInput["prices"] = [];
  for (const zone_id of ids(raw)) {
    const v = str(raw[`price_${zone_id}`]);
    if (!v) continue;
    const price = amount(v);
    if (price === null) errors[`price_${zone_id}`] = ar.admin.delivery.invalidAmount;
    else prices.push({ zone_id, price });
  }

  if (Object.keys(errors).length || !whatsapp) return { ok: false, errors };
  return { ok: true, value: { name, whatsapp, notes: notes || null, is_active: raw.is_active === "on", prices } };
}
