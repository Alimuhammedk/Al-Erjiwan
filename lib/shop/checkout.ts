import { ar } from "@/content/ar";
import type { Result } from "@/lib/admin/types";

const e = ar.checkout.errors;

export type CheckoutInput = {
  customer_name: string;
  phone: string;
  governorate: string;
  city: string;
  address: string; // made from city and landmark
  landmark: string;
  notes: string | null;
};

// An Iraqi mobile number typed any common way (Arabic digits, spaces, dashes, +964, 00964) becomes 07XXXXXXXXX.
// The database applies the same rule again; this one is for showing a friendly error early.
export function normalisePhone(input: string): string | null {
  let d = input
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, "");
  if (d.startsWith("00964")) d = "0" + d.slice(5);
  else if (d.startsWith("964")) d = "0" + d.slice(3);
  else if (d.length === 10 && d.startsWith("7")) d = "0" + d;
  return /^07\d{9}$/.test(d) ? d : null;
}

type Raw = Record<string, FormDataEntryValue | null | undefined>;
const str = (v: Raw[string]) => (typeof v === "string" ? v.trim() : "");

export function validateCheckout(raw: Raw): Result<CheckoutInput> {
  const errors: Record<string, string> = {};

  const customer_name = str(raw.customer_name);
  if (customer_name.length < 2) errors.customer_name = e.name;
  else if (customer_name.length > 100) errors.customer_name = e.tooLong;

  const phone = normalisePhone(str(raw.phone));
  if (!phone) errors.phone = e.phone;

  const governorate = str(raw.governorate);
  if (!governorate) errors.governorate = e.governorate;
  else if (governorate.length > 50) errors.governorate = e.tooLong;

  const required = (key: "city" | "landmark", max: number, message: string) => {
    const v = str(raw[key]);
    if (v.length < 2) errors[key] = message;
    else if (v.length > max) errors[key] = e.tooLong;
    return v;
  };
  const city = required("city", 100, e.city);
  const landmark = required("landmark", 150, e.landmark);
  const address = `${city} - ${landmark}`;

  const notes = str(raw.notes);
  if (notes.length > 500) errors.notes = e.tooLong;

  if (Object.keys(errors).length || !phone) return { ok: false, errors };
  return { ok: true, value: { customer_name, phone, governorate, city, address, landmark, notes: notes || null } };
}
