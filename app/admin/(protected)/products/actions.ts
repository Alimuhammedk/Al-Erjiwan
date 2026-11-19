"use server";

import { redirect } from "next/navigation";
import { ar } from "@/content/ar";
import { prepareProductSave, replaceProductImages, syncVariants } from "@/lib/admin/product-save";
import type { ProductSaveState } from "@/lib/admin/types";
import { requireAdmin } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-server";

// One save for the whole product: details, photos and sizes. Everything is checked first; then the product is
// written, then its photos and sizes. If a later step fails the product already exists, so the form is told its
// id and the next save updates it instead of creating a second copy.
export async function saveProductAction(_prev: ProductSaveState, formData: FormData): Promise<ProductSaveState> {
  await requireAdmin();
  const plan = prepareProductSave(formData);
  if (!plan.ok) return { errors: plan.errors };
  const { product, images, variants } = plan.value;

  const db = await createAuthClient();
  let id = plan.value.id;
  if (id) {
    const { error } = await db.from("products").update(product).eq("id", id);
    if (error) return { error: ar.admin.errors.saveFailed, savedId: id };
  } else {
    const { data, error } = await db.from("products").insert(product).select("id").single();
    if (error || !data) return { error: ar.admin.errors.saveFailed };
    id = data.id as string;
  }

  const imagesError = await replaceProductImages(db, id, images);
  const sizesError = await syncVariants(db, id, variants);
  if (imagesError || sizesError) return { error: ar.admin.errors.partialSave, savedId: id };
  redirect("/admin/products");
}

export async function toggleProductActiveAction(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  const db = await createAuthClient();
  const { error } = await db.from("products").update({ is_active: active }).eq("id", id);
  if (error) throw new Error(ar.admin.errors.saveFailed);
}

// Orders that contain the product are kept (database rule sets their product to empty).
export async function deleteProductAction(id: string): Promise<void> {
  await requireAdmin();
  const db = await createAuthClient();
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) throw new Error(ar.admin.errors.saveFailed);
  redirect("/admin/products");
}
