"use server";

import { redirect } from "next/navigation";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { isPageSlug, validatePage } from "@/lib/pages";
import { requireAdmin } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-server";

// Saves one of the four pages (both languages, and the map link of the About page).
export async function savePageAction(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!isPageSlug(slug)) return { error: ar.admin.errors.saveFailed };
  const result = validatePage(slug, Object.fromEntries(formData));
  if (!result.ok) return { errors: result.errors };

  const db = await createAuthClient();
  const { error } = await db.from("site_pages").update(result.value).eq("slug", slug);
  if (error) return { error: ar.admin.errors.saveFailed };
  redirect("/admin/pages");
}
