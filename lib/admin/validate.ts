import { ar } from "@/content/ar";
import type { BannerInput, CategoryInput, ProductInput, Result, VariantInput } from "./types";

type Raw = Record<string, FormDataEntryValue | string[] | null | undefined>;
const e = ar.admin.errors;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const str = (v: Raw[string]) => (typeof v === "string" ? v.trim() : "");
const flag = (v: Raw[string]) => v === "on" || v === "true";
const list = (v: Raw[string]) => (Array.isArray(v) ? v.map((x) => x.trim()).filter(Boolean) : []);

// Whole dinar only. Accepts Arabic-Indic digits and thousands separators (٬ and ,).
export function parsePrice(input: string): number | null {
  const digits = input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[,٬\s]/g, "");
  return /^\d{1,12}$/.test(digits) ? Number(digits) : null;
}

type Errors = Record<string, string>;

function text(raw: Raw, key: string, max: number, errors: Errors, required = false): string | null {
  const v = str(raw[key]);
  if (!v) {
    if (required) errors[key] = e.required;
    return null;
  }
  if (v.length > max) errors[key] = e.tooLong;
  return v;
}

function whole(raw: Raw, key: string, errors: Errors, message: string): number {
  const v = str(raw[key]);
  if (!v) return 0;
  const n = parsePrice(v);
  if (n === null) errors[key] = message;
  return n ?? 0;
}

function uuidOrNull(raw: Raw, key: string, errors: Errors): string | null {
  const v = str(raw[key]);
  if (!v) return null;
  if (!UUID.test(v)) errors[key] = e.required;
  return v;
}

function done<T>(errors: Errors, value: T): Result<T> {
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export function validateProduct(raw: Raw): Result<ProductInput> {
  const errors: Errors = {};
  const name_ar = text(raw, "name_ar", 200, errors, true) ?? "";
  const name_en = text(raw, "name_en", 200, errors);
  const description = text(raw, "description", 5000, errors);
  const brand = text(raw, "brand", 100, errors);
  const category_id = uuidOrNull(raw, "category_id", errors);

  const basePrice = parsePrice(str(raw.base_price));
  if (basePrice === null) errors.base_price = e.invalidPrice;

  let sale_price: number | null = null;
  if (str(raw.sale_price)) {
    sale_price = parsePrice(str(raw.sale_price));
    if (sale_price === null) errors.sale_price = e.invalidPrice;
    else if (basePrice !== null && sale_price >= basePrice) errors.sale_price = e.salePriceTooHigh;
  }

  const stock = whole(raw, "stock", errors, e.invalidStock);

  const finish = str(raw.finish) || null;
  if (finish && !(ar.options.finishes as readonly string[]).includes(finish)) errors.finish = e.required;
  const rooms = list(raw.rooms);
  if (rooms.some((r) => !(ar.options.rooms as readonly string[]).includes(r))) errors.rooms = e.required;

  return done(errors, {
    name_ar,
    name_en,
    description,
    category_id,
    brand,
    base_price: basePrice ?? 0,
    sale_price,
    stock,
    is_active: flag(raw.is_active),
    is_featured: flag(raw.is_featured),
    is_tintable: flag(raw.is_tintable),
    finish,
    rooms,
  });
}

export function validateVariant(raw: Raw): Result<VariantInput> {
  const errors: Errors = {};
  const size_label = text(raw, "size_label", 50, errors, true) ?? "";
  const price = parsePrice(str(raw.price));
  if (price === null) errors.price = e.invalidPrice;
  const stock = whole(raw, "stock", errors, e.invalidStock);
  const colour_id = uuidOrNull(raw, "colour_id", errors);
  return done(errors, { size_label, price: price ?? 0, stock, colour_id });
}

function imageUrl(raw: Raw, key: string, errors: Errors, required: boolean): string | null {
  const v = str(raw[key]);
  if (!v) {
    if (required) errors[key] = e.required;
    return null;
  }
  if (!/^https:\/\//.test(v)) errors[key] = e.invalidImage;
  return v;
}

export function validateCategory(raw: Raw): Result<CategoryInput> {
  const errors: Errors = {};
  const name_ar = text(raw, "name_ar", 200, errors, true) ?? "";
  const name_en = text(raw, "name_en", 200, errors);
  const image_url = imageUrl(raw, "image_url", errors, false);
  const sort_order = whole(raw, "sort_order", errors, e.invalidStock);
  return done(errors, { name_ar, name_en, image_url, sort_order });
}

export function validateBanner(raw: Raw): Result<BannerInput> {
  const errors: Errors = {};
  const image_url = imageUrl(raw, "image_url", errors, true) ?? "";
  const title = text(raw, "title", 200, errors);
  const sort_order = whole(raw, "sort_order", errors, e.invalidStock);

  const link = str(raw.link);
  const okLink = !link || (link.startsWith("/") && !link.startsWith("//")) || /^https?:\/\//.test(link);
  if (!okLink) errors.link = e.invalidLink;

  return done(errors, {
    image_url,
    title,
    link: link || null,
    sort_order,
    is_active: flag(raw.is_active),
  });
}
