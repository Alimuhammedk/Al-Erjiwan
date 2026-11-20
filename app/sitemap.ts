import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/seo";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// The public addresses for search engines: shown products and published articles, never hidden ones.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: { id: string; created_at?: string }[] = [];
  let articles: { id: string; updated_at?: string }[] = [];
  try {
    const db = createServerClient();
    if (db) {
      const [p, a] = await Promise.all([
        db.from("products").select("id, created_at").eq("is_active", true).limit(5000),
        db.from("articles").select("id, updated_at").eq("is_published", true).limit(1000),
      ]);
      if (!p.error) products = (p.data as typeof products | null) ?? [];
      if (!a.error) articles = (a.data as typeof articles | null) ?? [];
    }
  } catch {
    // an empty list is fine: the fixed pages are still listed
  }
  return sitemapEntries({ products, articles }).map((e) => ({ url: e.url, ...(e.lastModified ? { lastModified: e.lastModified } : {}) }));
}
