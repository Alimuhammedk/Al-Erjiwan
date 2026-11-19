"use server";

import { redirect } from "next/navigation";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { validateBanner } from "@/lib/admin/validate";
import { requireAdmin } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-server";

export async function saveBannerAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const result = validateBanner(Object.fromEntries(formData));
  if (!result.ok) return { errors: result.errors };

  const db = await createAuthClient();
  const { error } = await (id
    ? db.from("banners").update(result.value).eq("id", id)
    : db.from("banners").insert(result.value));
  if (error) return { error: ar.admin.errors.saveFailed };
  redirect("/admin/storefront");
}

export async function deleteBannerAction(id: string): Promise<void> {
  await requireAdmin();
  const db = await createAuthClient();
  const { error } = await db.from("banners").delete().eq("id", id);
  if (error) throw new Error(ar.admin.errors.saveFailed);
  redirect("/admin/storefront");
}
