import { createServerClient } from "@/lib/supabase/server";
import type { Category } from "@/types/db";

export async function getCategories(): Promise<Category[]> {
  try {
    const db = createServerClient({ cached: true });
    if (!db) return [];
    const { data, error } = await db.from("categories").select("*").order("sort_order");
    return error ? [] : ((data as Category[] | null) ?? []);
  } catch {
    return [];
  }
}
