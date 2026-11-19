"use server";

import { redirect } from "next/navigation";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { validateArticle } from "@/lib/articles";
import { requireAdmin } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const failed: ActionState = { error: ar.admin.errors.saveFailed };

// Saves an article (new, or an edit by id). A new article is dated now; an edit keeps its date.
export async function saveArticleAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  if (id !== null && !UUID.test(id)) return failed;
  const result = validateArticle(Object.fromEntries(formData));
  if (!result.ok) return { errors: result.errors };

  const db = await createAuthClient();
  const { error } = await (id ? db.from("articles").update(result.value).eq("id", id) : db.from("articles").insert(result.value));
  if (error) return failed;
  redirect("/admin/articles");
}

// Shows or hides an article from the homepage without opening it.
export async function toggleArticleAction(id: string, published: boolean): Promise<void> {
  await requireAdmin();
  if (!UUID.test(id)) throw new Error(ar.admin.errors.saveFailed);
  const db = await createAuthClient();
  const { error } = await db.from("articles").update({ is_published: published }).eq("id", id);
  if (error) throw new Error(ar.admin.errors.saveFailed);
  redirect("/admin/articles");
}

export async function deleteArticleAction(id: string): Promise<void> {
  await requireAdmin();
  if (!UUID.test(id)) throw new Error(ar.admin.errors.saveFailed);
  const db = await createAuthClient();
  const { error } = await db.from("articles").delete().eq("id", id);
  if (error) throw new Error(ar.admin.errors.saveFailed);
  redirect("/admin/articles");
}
