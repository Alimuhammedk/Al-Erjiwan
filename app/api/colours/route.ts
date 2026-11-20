import { NextResponse } from "next/server";
import { parseColourQuery } from "@/lib/colours/query";
import { listColourFamilies, productColourScope, runColourSearch } from "@/lib/colours/search";
import { createServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PANEL_SHOWN = 60;

// The colours a mixed-paint product offers, for the colour panel on its page: up to 60 shades by name or code,
// plus the families to filter by. It never fails: with no database, an unknown product or an error the answer is
// an empty list, so the product page keeps working.
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseColourQuery({ q: params.q, family: params.family });
  const product = UUID.test(params.product ?? "") ? params.product : null;
  const db = createServerClient();
  const headers = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

  const scope = db && product ? await productColourScope(db, product) : "none";
  if (!db || !product || scope === "none") return NextResponse.json({ colours: [], families: [] }, { headers });

  const only = scope === "list" ? product : undefined;
  const [{ colours }, families] = await Promise.all([
    runColourSearch(db, { q: query.q, family: query.family, page: 1 }, PANEL_SHOWN, only),
    listColourFamilies(db, only),
  ]);
  return NextResponse.json(
    { colours: colours.map(({ id, name_ar, name_en, code, hex, family, system }) => ({ id, name_ar, name_en: name_en ?? null, code, hex, family, system: system ?? null })), families },
    { headers },
  );
}
