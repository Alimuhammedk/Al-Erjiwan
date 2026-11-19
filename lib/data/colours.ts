import type { SupabaseClient } from "@supabase/supabase-js";
import type { ColourQuery } from "@/lib/colours/query";
import { COLOUR_COLUMNS, listColourFamilies, runClosestColours, runColourSearch, type PickableColour } from "@/lib/colours/search";
import { createServerClient } from "@/lib/supabase/server";

export type ColourProduct = { id: string; name: string; kind: "ready" | "mixed" };

export type ColourPageData = {
  colours: PickableColour[];
  total: number;
  families: string[];
  closest: PickableColour[] | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CLOSEST_SHOWN = 12;

// Everything the colour page needs, read with the public key. Any failure gives empty lists, never an error page.
export async function getColourPage(q: ColourQuery): Promise<ColourPageData> {
  const empty: ColourPageData = { colours: [], total: 0, families: [], closest: null };
  const db = createServerClient();
  if (!db) return empty;
  const [results, families, closest] = await Promise.all([
    runColourSearch(db, q),
    listColourFamilies(db),
    q.hex ? runClosestColours(db, q.hex, CLOSEST_SHOWN) : Promise.resolve(null),
  ]);
  return { ...results, families, closest };
}

export async function getColourById(id: string, db: SupabaseClient | null = createServerClient()): Promise<PickableColour | null> {
  if (!UUID.test(id) || !db) return null;
  try {
    const { data, error } = await db.from("colours").select(COLOUR_COLUMNS).eq("id", id).maybeSingle();
    return error ? null : ((data as PickableColour | null) ?? null);
  } catch {
    return null;
  }
}

type ProductRow = { id: string; name_ar: string };

// Products a customer can order in this shade: ready-made ones whose sizes use it, and every mixed-paint product.
export async function productsForColour(colourId: string, db: SupabaseClient | null = createServerClient()): Promise<ColourProduct[]> {
  if (!UUID.test(colourId) || !db) return [];
  try {
    const [ready, mixed] = await Promise.all([
      db.from("products").select("id, name_ar, product_variants!inner(colour_id)").eq("is_active", true).eq("product_variants.colour_id", colourId).limit(12),
      db.from("products").select("id, name_ar").eq("is_active", true).eq("is_tintable", true).limit(12),
    ]);
    const list: ColourProduct[] = [];
    for (const p of (ready.error ? [] : ((ready.data as ProductRow[] | null) ?? []))) list.push({ id: p.id, name: p.name_ar, kind: "ready" });
    for (const p of (mixed.error ? [] : ((mixed.data as ProductRow[] | null) ?? []))) {
      if (!list.some((x) => x.id === p.id)) list.push({ id: p.id, name: p.name_ar, kind: "mixed" });
    }
    return list;
  } catch {
    return [];
  }
}
