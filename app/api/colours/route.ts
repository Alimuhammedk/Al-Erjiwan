import { NextResponse } from "next/server";
import { parseColourQuery } from "@/lib/colours/query";
import { runColourSearch } from "@/lib/colours/search";
import { createServerClient } from "@/lib/supabase/server";

// Search for the colour picker on mixed-paint products: up to 24 shades by name or code. It never fails: with no
// database or an error the answer is an empty list, so the product page keeps working.
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseColourQuery({ q: params.q, family: params.family });
  const db = createServerClient();
  const { colours } = db ? await runColourSearch(db, { q: query.q, family: query.family, page: 1 }) : { colours: [] };
  return NextResponse.json(
    {
      colours: colours.map(({ id, name_ar, code, hex, family, system }) => ({ id, name_ar, code, hex, family, system: system ?? null })),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
