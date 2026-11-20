"use server";

import { refreshCatalog } from "@/lib/cache";
import { redirect } from "next/navigation";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { validateCategory } from "@/lib/admin/validate";
import { requireAdmin } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-server";

export async function saveCategoryAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const result = validateCategory(Object.fromEntries(formData));
  if (!result.ok) return { errors: result.errors };

  const db = await createAuthClient();
  const { error } = await (id
    ? db.from("categories").update(result.value).eq("id", id)
    : db.from("categories").insert(result.value));
  if (error) return { error: ar.admin.errors.saveFailed };
  refreshCatalog();
  redirect("/admin/categories");
}

// Products in the category stay; their category becomes empty (database rule).
export async function deleteCategoryAction(id: string): Promise<void> {
  await requireAdmin();
  const db = await createAuthClient();
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) throw new Error(ar.admin.errors.saveFailed);
  refreshCatalog();
  redirect("/admin/categories");
}
