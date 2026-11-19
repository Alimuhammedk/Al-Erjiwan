import type { SupabaseClient } from "@supabase/supabase-js";
import { ar } from "@/content/ar";
import { storagePathFromUrl } from "@/lib/images";
import type { ProductInput, Result, VariantInput } from "./types";
import { isImageUrl, validateProduct, validateVariant } from "./validate";

const e = ar.admin.errors;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IMAGES = 12;
const MAX_SIZES = 30;

export type SizeRow = VariantInput & { id: string | null };
export type ProductColours = { all: boolean; ids: string[] };
export type ProductSavePlan = { id: string | null; product: ProductInput; images: string[]; variants: SizeRow[]; colours: ProductColours };
const MAX_COLOURS = 3000;

// The form sends photos and sizes as JSON text in hidden fields. Anything that isn't a list becomes null.
function parseList(v: FormDataEntryValue | undefined): unknown[] | null {
  if (v === undefined || v === "") return [];
  if (typeof v !== "string") return null;
  try {
    const data: unknown = JSON.parse(v);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// Turns what the single product form posted into one checked plan (product, photos, sizes), without touching
// the database. Everything is validated before anything is saved. A product with sizes takes its price from
// them: the lowest size price is the "from" price and the stock is the total.
export function prepareProductSave(formData: FormData): Result<ProductSavePlan> {
  const entries = Object.fromEntries(formData);
  const errors: Record<string, string> = {};
  const hasSizes = entries.has_sizes === "on" || entries.has_sizes === "true";

  // Photos
  let images: string[] = [];
  const rawImages = parseList(entries.images);
  if (rawImages === null || rawImages.some((u) => typeof u !== "string" || !isImageUrl(u))) errors.images = e.invalidImage;
  else if (rawImages.length > MAX_IMAGES) errors.images = e.tooManyImages;
  else images = rawImages as string[];

  // Sizes (only when the sizes switch is on)
  const variants: SizeRow[] = [];
  if (hasSizes) {
    const rows = parseList(entries.variants);
    if (rows === null) errors.variants = e.saveFailed;
    else if (rows.length === 0) errors.variants = e.needSize;
    else if (rows.length > MAX_SIZES) errors.variants = e.tooLong;
    else {
      rows.forEach((row, i) => {
        const obj = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
        const text = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v == null ? "" : String(v)]));
        const r = validateVariant(text);
        if (!r.ok) return void Object.entries(r.errors).forEach(([k, m]) => (errors[`variants.${i}.${k}`] = m));
        const id = typeof obj.id === "string" && UUID.test(obj.id) ? obj.id : null;
        variants.push({ ...r.value, id });
      });
    }
  }

  // Colours a mixed paint offers: every catalogue colour, or only the ticked ones (at least one).
  const tintable = entries.is_tintable === "on" || entries.is_tintable === "true";
  let colours: ProductColours = { all: true, ids: [] };
  if (tintable && entries.colour_mode === "some") {
    const raw = parseList(entries.colour_ids);
    const ids = raw === null ? null : [...new Set(raw.filter((x): x is string => typeof x === "string" && UUID.test(x)))];
    if (ids === null || raw!.length > MAX_COLOURS) errors.colours = e.saveFailed;
    else if (ids.length === 0) errors.colours = e.needColour;
    else colours = { all: false, ids };
  }

  // Product. With sizes, the price and stock come from them and a sale price does not apply.
  const raw: Record<string, FormDataEntryValue | string[]> = { ...entries };
  if (hasSizes) {
    raw.base_price = String(variants.length ? Math.min(...variants.map((v) => v.price)) : 0);
    raw.stock = String(variants.reduce((n, v) => n + v.stock, 0));
    raw.sale_price = "";
  }
  const product = validateProduct(raw);
  if (!product.ok) Object.assign(errors, product.errors);

  if (Object.keys(errors).length || !product.ok) return { ok: false, errors };
  const id = typeof entries.id === "string" && UUID.test(entries.id) ? entries.id : null;
  return { ok: true, value: { id, product: { ...product.value, all_colours: colours.all }, images, variants, colours } };
}

// Replaces a product's photo list; array position becomes sort_order (first = main photo). Returns an Arabic
// error message, or null when it worked.
// shortcut: delete-then-insert is not atomic. If the insert fails the photos can be added again, and files are
// only removed from storage after a successful save, so nothing is lost for good. Upgrade if that ever hurts.
export async function replaceProductImages(db: SupabaseClient, productId: string, urls: string[]): Promise<string | null> {
  const { data: old } = await db.from("product_images").select("url").eq("product_id", productId);
  const del = await db.from("product_images").delete().eq("product_id", productId);
  if (del.error) return e.saveFailed;
  if (urls.length) {
    const ins = await db.from("product_images").insert(urls.map((url, i) => ({ product_id: productId, url, sort_order: i })));
    if (ins.error) return e.saveFailed;
  }
  const dropped = ((old as { url: string }[] | null) ?? [])
    .map((r) => r.url)
    .filter((u) => !urls.includes(u))
    .map(storagePathFromUrl)
    .filter((p): p is string => p !== null);
  if (dropped.length) await db.storage.from("images").remove(dropped).catch(() => undefined);
  return null;
}

// Sizes are updated in place by id so past orders keep pointing at the right size; sizes that are no longer
// in the list are deleted, and an id that isn't one of this product's sizes is treated as a new size.
export async function syncVariants(db: SupabaseClient, productId: string, rows: SizeRow[]): Promise<string | null> {
  const { data } = await db.from("product_variants").select("id").eq("product_id", productId);
  const known = new Set(((data as { id: string }[] | null) ?? []).map((r) => r.id));

  const kept = rows.filter((r) => r.id !== null && known.has(r.id));
  const added = rows.filter((r) => !(r.id !== null && known.has(r.id)));
  const keptIds = new Set(kept.map((r) => r.id));
  const dropped = [...known].filter((id) => !keptIds.has(id));

  if (kept.length) {
    const { error } = await db.from("product_variants").upsert(
      kept.map((r) => ({ id: r.id, product_id: productId, size_label: r.size_label, price: r.price, stock: r.stock, colour_id: r.colour_id })),
    );
    if (error) return e.saveFailed;
  }
  if (added.length) {
    const { error } = await db.from("product_variants").insert(
      added.map((r) => ({ product_id: productId, size_label: r.size_label, price: r.price, stock: r.stock, colour_id: r.colour_id })),
    );
    if (error) return e.saveFailed;
  }
  if (dropped.length) {
    const { error } = await db.from("product_variants").delete().in("id", dropped);
    if (error) return e.saveFailed;
  }
  return null;
}

// Saves which colours a mixed paint offers. Chosen colours are written first and the ones no longer wanted removed
// after, so a failure leaves the old list rather than an empty one. "All colours" keeps no rows at all.
export async function syncProductColours(db: SupabaseClient, productId: string, colours: ProductColours): Promise<string | null> {
  const ids = colours.all ? [] : colours.ids;
  if (ids.length) {
    const { error } = await db.from("product_colours").upsert(ids.map((colour_id) => ({ product_id: productId, colour_id })), { onConflict: "product_id,colour_id" });
    if (error) return e.saveFailed;
  }
  const stale = db.from("product_colours").delete().eq("product_id", productId);
  const { error } = await (ids.length ? stale.not("colour_id", "in", `(${ids.join(",")})`) : stale);
  return error ? e.saveFailed : null;
}
