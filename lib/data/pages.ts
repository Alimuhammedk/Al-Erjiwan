import { isPageSlug, type SitePage } from "@/lib/pages";
import { createServerClient } from "@/lib/supabase/server";

const COLUMNS = "slug, title_ar, title_en, body_ar, body_en, map_url, updated_at";

// One of the four pages, or null for an unknown name, a missing row or any error (the page then shows "not found").
export async function getPage(slug: string): Promise<SitePage | null> {
  if (!isPageSlug(slug)) return null;
  try {
    const db = createServerClient({ cached: true });
    if (!db) return null;
    const { data, error } = await db.from("site_pages").select(COLUMNS).eq("slug", slug).maybeSingle();
    return error ? null : ((data as SitePage | null) ?? null);
  } catch {
    return null;
  }
}
