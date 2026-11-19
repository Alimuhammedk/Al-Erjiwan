"use server";

import { redirect } from "next/navigation";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { validateProduct } from "@/lib/admin/validate";
import { requireAdmin } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-server";

export async function saveProductAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const result = validateProduct({ ...Object.fromEntries(formData), rooms: formData.getAll("rooms").map(String) });
  if (!result.ok) return { errors: result.errors };

  const db = await createAuthClient();
  if (id) {
    const { error } = await db.from("products").update(result.value).eq("id", id);
    if (error) return { error: ar.admin.errors.saveFailed };
    redirect("/admin/products");
  }
  const { data, error } = await db.from("products").insert(result.value).select("id").single();
  if (error || !data) return { error: ar.admin.errors.saveFailed };
  redirect(`/admin/products/${data.id}`); // open it so photos and sizes can be added
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
