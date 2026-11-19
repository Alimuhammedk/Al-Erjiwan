import { createServerClient } from "@/lib/supabase/server";
import type { Banner } from "@/types/db";

export async function getBanners(): Promise<Banner[]> {
  try {
    const db = createServerClient();
    if (!db) return [];
    const { data, error } = await db
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return error ? [] : ((data as Banner[] | null) ?? []);
  } catch {
    return [];
  }
}
