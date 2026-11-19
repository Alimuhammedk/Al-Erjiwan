import type { Article } from "@/lib/articles";
import { createAuthClient } from "@/lib/supabase/auth-server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = "id, title, excerpt, body, title_en, excerpt_en, body_en, cover_url, images, is_published, published_at, updated_at";

// Every article (published or not), newest first, for the admin list. Empty if anything goes wrong.
export async function listAdminArticles(): Promise<Article[]> {
  try {
    const db = await createAuthClient();
    const { data, error } = await db.from("articles").select(COLUMNS).order("published_at", { ascending: false });
    return error ? [] : ((data as Article[] | null) ?? []);
  } catch {
    return [];
  }
}

export async function getAdminArticle(id: string): Promise<Article | null> {
  if (!UUID.test(id)) return null;
  try {
    const db = await createAuthClient();
    const { data, error } = await db.from("articles").select(COLUMNS).eq("id", id).maybeSingle();
    return error ? null : ((data as Article | null) ?? null);
  } catch {
    return null;
  }
}
