import { PAGE_SLUGS, isPageSlug, type SitePage } from "@/lib/pages";
import { createAuthClient } from "@/lib/supabase/auth-server";

const COLUMNS = "slug, title_ar, title_en, body_ar, body_en, map_url, updated_at";

// The four pages in their fixed order, for the admin list. Empty if anything goes wrong.
export async function listAdminPages(): Promise<SitePage[]> {
  try {
    const db = await createAuthClient();
    const { data, error } = await db.from("site_pages").select(COLUMNS);
    if (error || !data) return [];
    const rows = data as SitePage[];
    return PAGE_SLUGS.map((s) => rows.find((r) => r.slug === s)).filter((r): r is SitePage => Boolean(r));
  } catch {
    return [];
  }
}

export async function getAdminPage(slug: string): Promise<SitePage | null> {
  if (!isPageSlug(slug)) return null;
  try {
    const db = await createAuthClient();
    const { data, error } = await db.from("site_pages").select(COLUMNS).eq("slug", slug).maybeSingle();
    return error ? null : ((data as SitePage | null) ?? null);
  } catch {
    return null;
  }
}
