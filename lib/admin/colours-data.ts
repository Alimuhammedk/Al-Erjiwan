import { COLOUR_COLUMNS, listColourFamilies, runColourSearch, type PickableColour } from "@/lib/colours/search";
import type { ColourQuery } from "@/lib/colours/query";
import { createAuthClient } from "@/lib/supabase/auth-server";

export type AdminColour = PickableColour & { system: string | null };
export type ColourListItem = AdminColour & { sizes: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One page of the catalogue for the admin list, with how many ready-made sizes use each shade (for the delete warning).
export async function listAdminColours(q: ColourQuery): Promise<{ colours: ColourListItem[]; total: number; families: string[] }> {
  try {
    const db = await createAuthClient();
    const [{ colours, total }, families] = await Promise.all([runColourSearch(db, q, 30), listColourFamilies(db)]);
    const ids = colours.map((c) => c.id);
    const used = new Map<string, number>();
    if (ids.length) {
      const { data } = await db.from("product_variants").select("colour_id").in("colour_id", ids);
      for (const r of (data as { colour_id: string }[] | null) ?? []) used.set(r.colour_id, (used.get(r.colour_id) ?? 0) + 1);
    }
    return { colours: colours.map((c) => ({ ...(c as AdminColour), system: c.system ?? null, sizes: used.get(c.id) ?? 0 })), total, families };
  } catch {
    return { colours: [], total: 0, families: [] };
  }
}

export async function getAdminColour(id: string): Promise<AdminColour | null> {
  if (!UUID.test(id)) return null;
  try {
    const db = await createAuthClient();
    const { data } = await db.from("colours").select(COLOUR_COLUMNS).eq("id", id).maybeSingle();
    return (data as AdminColour | null) ?? null;
  } catch {
    return null;
  }
}
