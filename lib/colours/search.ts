import type { SupabaseClient } from "@supabase/supabase-js";
import type { Colour } from "@/types/db";
import { COLOURS_PER_PAGE, type ColourQuery } from "./query";

export type PickableColour = Pick<Colour, "id" | "name_ar" | "name_en" | "code" | "hex" | "family"> & { system?: string | null };

export const COLOUR_COLUMNS = "id, name_ar, name_en, system, code, hex, family";
const ONLY_PRODUCT = "product_colours!inner(product_id)";

// One page of the catalogue, searched in the database (name, English name or code; optional family), ordered by
// family then name. With `onlyProduct` it searches just the colours that product offers. Works with the public
// client and the admin one. Returns nothing rather than failing.
export async function runColourSearch(
  db: SupabaseClient,
  q: Pick<ColourQuery, "q" | "family" | "page">,
  perPage = COLOURS_PER_PAGE,
  onlyProduct?: string,
): Promise<{ colours: PickableColour[]; total: number }> {
  try {
    let query = db.from("colours").select(onlyProduct ? `${COLOUR_COLUMNS}, ${ONLY_PRODUCT}` : COLOUR_COLUMNS, { count: "exact" });
    if (onlyProduct) query = query.eq("product_colours.product_id", onlyProduct);
    if (q.q) query = query.or(`name_ar.ilike.%${q.q}%,name_en.ilike.%${q.q}%,code.ilike.%${q.q}%`);
    if (q.family) query = query.eq("family", q.family);
    const from = (q.page - 1) * perPage;
    const { data, count, error } = await query
      .order("family", { ascending: true, nullsFirst: false })
      .order("name_ar", { ascending: true })
      .range(from, from + perPage - 1);
    if (error) return { colours: [], total: 0 };
    const rows = (data as unknown as (PickableColour & { product_colours?: unknown })[] | null) ?? [];
    return { colours: rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "product_colours")) as PickableColour), total: count ?? 0 };
  } catch {
    return { colours: [], total: 0 };
  }
}

// The families that exist in the catalogue (or in one product's colour list), alphabetical, for the filter tabs.
export async function listColourFamilies(db: SupabaseClient, onlyProduct?: string): Promise<string[]> {
  try {
    let query = db.from("colours").select(onlyProduct ? `family, ${ONLY_PRODUCT}` : "family").not("family", "is", null);
    if (onlyProduct) query = query.eq("product_colours.product_id", onlyProduct);
    const { data, error } = await query.limit(5000);
    if (error || !data) return [];
    return [...new Set((data as unknown as { family: string }[]).map((r) => r.family))].sort((a, b) => a.localeCompare(b, "ar"));
  } catch {
    return [];
  }
}

// Does a mixed paint offer the whole catalogue, or only a chosen list? Unknown or hidden products offer nothing.
export async function productColourScope(db: SupabaseClient, productId: string): Promise<"all" | "list" | "none"> {
  try {
    const { data, error } = await db.from("products").select("all_colours, is_active, is_tintable").eq("id", productId).maybeSingle();
    const p = data as { all_colours: boolean | null; is_active: boolean; is_tintable: boolean } | null;
    if (error || !p || !p.is_active || !p.is_tintable) return "none";
    return p.all_colours === false ? "list" : "all";
  } catch {
    return "none";
  }
}
