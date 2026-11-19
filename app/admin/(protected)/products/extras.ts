"use server";

import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { isImageUrl, validateVariant } from "@/lib/admin/validate";
import { requireAdmin } from "@/lib/auth";
import { storagePathFromUrl } from "@/lib/images";
import { createAuthClient } from "@/lib/supabase/auth-server";

const failed: ActionState = { error: ar.admin.errors.saveFailed };

// Replaces a product's photo list; array position becomes sort_order (first = main photo).
// shortcut: delete-then-insert is not atomic. If the insert fails the photos can be re-added
// (files are only removed from storage after a successful save), upgrade if that ever hurts.
export async function saveProductImagesAction(productId: string, urls: string[]): Promise<ActionState> {
  await requireAdmin();
  if (urls.some((u) => !isImageUrl(u))) return { error: ar.admin.errors.invalidImage };

  const db = await createAuthClient();
  const { data: old } = await db.from("product_images").select("url").eq("product_id", productId);
  const del = await db.from("product_images").delete().eq("product_id", productId);
  if (del.error) return failed;
  if (urls.length) {
    const ins = await db
      .from("product_images")
      .insert(urls.map((url, i) => ({ product_id: productId, url, sort_order: i })));
    if (ins.error) return failed;
  }

  const dropped = ((old as { url: string }[] | null) ?? [])
    .map((r) => r.url)
    .filter((u) => !urls.includes(u))
    .map(storagePathFromUrl)
    .filter((p): p is string => p !== null);
  if (dropped.length) await db.storage.from("images").remove(dropped).catch(() => undefined);
  return {};
}

// Sizes are updated in place by id so past orders keep pointing at the right size;
// only sizes the admin removed are deleted.
export async function saveVariantsAction(
  productId: string,
  rows: Record<string, string>[],
): Promise<ActionState> {
  await requireAdmin();

  const errors: Record<string, string> = {};
  const values = rows.map((raw, i) => {
    const r = validateVariant(raw);
    if (!r.ok) Object.entries(r.errors).forEach(([k, m]) => (errors[`${i}.${k}`] = m));
    return r.ok ? { id: raw.id?.trim() || null, ...r.value } : null;
  });
  if (Object.keys(errors).length) return { errors };

  const db = await createAuthClient();
  const { data } = await db.from("product_variants").select("id").eq("product_id", productId);
  const known = new Set(((data as { id: string }[] | null) ?? []).map((r) => r.id));

  const kept = values.filter((v) => v && v.id && known.has(v.id)) as NonNullable<(typeof values)[number]>[];
  const added = values.filter((v) => v && !(v.id && known.has(v.id))) as NonNullable<(typeof values)[number]>[];
  const keptIds = new Set(kept.map((v) => v.id));
  const dropped = [...known].filter((id) => !keptIds.has(id));

  if (kept.length) {
    const { error } = await db
      .from("product_variants")
      .upsert(kept.map((v) => ({ ...v, product_id: productId })));
    if (error) return failed;
  }
  if (added.length) {
    const { error } = await db
      .from("product_variants")
      .insert(
        added.map((v) => ({
          product_id: productId,
          size_label: v.size_label,
          price: v.price,
          stock: v.stock,
          colour_id: v.colour_id,
        })),
      );
    if (error) return failed;
  }
  if (dropped.length) {
    const { error } = await db.from("product_variants").delete().in("id", dropped);
    if (error) return failed;
  }
  return {};
}
