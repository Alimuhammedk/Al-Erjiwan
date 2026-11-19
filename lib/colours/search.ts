import type { SupabaseClient } from "@supabase/supabase-js";
import type { Colour } from "@/types/db";
import { COLOURS_PER_PAGE, type ColourQuery } from "./query";

export type PickableColour = Pick<Colour, "id" | "name_ar" | "name_en" | "code" | "hex" | "family"> & { system?: string | null };

export const COLOUR_COLUMNS = "id, name_ar, name_en, system, code, hex, family";

// One page of the catalogue, searched in the database (name, English name or code; optional family), ordered by
// family then name. Works with the public client and the admin one. Returns nothing rather than failing.
export async function runColourSearch(
  db: SupabaseClient,
  q: Pick<ColourQuery, "q" | "family" | "page">,
  perPage = COLOURS_PER_PAGE,
): Promise<{ colours: PickableColour[]; total: number }> {
  try {
    let query = db.from("colours").select(COLOUR_COLUMNS, { count: "exact" });
    if (q.q) query = query.or(`name_ar.ilike.%${q.q}%,name_en.ilike.%${q.q}%,code.ilike.%${q.q}%`);
    if (q.family) query = query.eq("family", q.family);
    const from = (q.page - 1) * perPage;
    const { data, count, error } = await query
      .order("family", { ascending: true, nullsFirst: false })
      .order("name_ar", { ascending: true })
      .range(from, from + perPage - 1);
    if (error) return { colours: [], total: 0 };
    return { colours: (data as PickableColour[] | null) ?? [], total: count ?? 0 };
  } catch {
    return { colours: [], total: 0 };
  }
}

// The families that exist in the catalogue (for the filter chips), in alphabetical order.
export async function listColourFamilies(db: SupabaseClient): Promise<string[]> {
  try {
    const { data, error } = await db.from("colours").select("family").not("family", "is", null).limit(5000);
    if (error || !data) return [];
    return [...new Set((data as { family: string }[]).map((r) => r.family))].sort((a, b) => a.localeCompare(b, "ar"));
  } catch {
    return [];
  }
}

// The shades nearest to a colour, using the database function.
export async function runClosestColours(db: SupabaseClient, hex: string, limit = 12): Promise<PickableColour[]> {
  try {
    const { data, error } = await db.rpc("closest_colours", { p_hex: hex, p_limit: limit });
    return error ? [] : ((data as PickableColour[] | null) ?? []);
  } catch {
    return [];
  }
}
