import { ar } from "@/content/ar";
import type { Result } from "./types";

// Delivery fees: checking what the owner types.

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
