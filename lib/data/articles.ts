import type { Article } from "@/lib/articles";
import { createServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const HOME_ARTICLES = 8;

// The newest published articles for the homepage. Any failure gives an empty list (the section then hides itself).
export async function getHomeArticles(limit = HOME_ARTICLES): Promise<Article[]> {
  try {
    const db = createServerClient();
    if (!db) return [];
    const { data, error } = await db
      .from("articles")
      .select("id, title, excerpt, body, cover_url, images, is_published, published_at, updated_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(limit);
    return error ? [] : ((data as Article[] | null) ?? []);
  } catch {
    return [];
  }
}

// One published article, or null for a bad id, a draft, a missing one or any error (the page then shows "not found").
export async function getArticle(id: string): Promise<Article | null> {
  if (!UUID.test(id)) return null;
  try {
    const db = createServerClient();
    if (!db) return null;
    const { data, error } = await db
      .from("articles")
      .select("id, title, excerpt, body, cover_url, images, is_published, published_at, updated_at")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();
    const a = data as Article | null;
    return error || !a || !a.is_published ? null : a;
  } catch {
    return null;
  }
}
