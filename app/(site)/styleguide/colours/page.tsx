import { notFound } from "next/navigation";
import { ColourBrowser } from "@/components/colours/ColourBrowser";
import { closestFrom } from "@/lib/colours/closest";
import { COLOURS_PER_PAGE, parseColourQuery } from "@/lib/colours/query";
import type { PickableColour } from "@/lib/colours/search";

// Dev-only copy of the colour page with sample shades, searched in memory (?empty=1 shows the empty state).
// Remove before launch.
const mk = (n: number, name_ar: string, code: string, hex: string, family: string): PickableColour => ({
  id: `123e4567-e89b-12d3-a456-4266141740${String(n).padStart(2, "0")}`,
  name_ar,
  name_en: null,
  code,
  system: "JW",
  hex,
  family,
});
const SAMPLE: PickableColour[] = [
  mk(1, "أبيض ثلجي", "JW-101", "#f7f7f2", "الأبيض"),
  mk(2, "كريمي", "JW-102", "#f3e9d2", "الأبيض"),
  mk(3, "رمادي فاتح", "JW-201", "#d9d9d9", "الرمادي"),
  mk(4, "رمادي فحمي", "JW-202", "#4a4a4f", "الرمادي"),
  mk(5, "أزرق سماوي", "JW-301", "#bfe0f2", "الأزرق"),
  mk(6, "أزرق ملكي", "JW-302", "#2f4b9a", "الأزرق"),
  mk(7, "أخضر نعناعي", "JW-401", "#bfe8d2", "الأخضر"),
  mk(8, "أخضر زيتوني", "JW-402", "#6b7a3a", "الأخضر"),
  mk(9, "وردي هادئ", "JW-601", "#f2c4ce", "الوردي"),
  mk(10, "أحمر طوبي", "JW-501", "#b5412f", "الأحمر"),
];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ColoursHarness({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const query = parseColourQuery(params);
  const all = first(params.empty) ? [] : SAMPLE;
  const needle = query.q.toLowerCase();
  const matches = all.filter(
    (c) => (!needle || c.name_ar.includes(query.q) || (c.code ?? "").toLowerCase().includes(needle)) && (!query.family || c.family === query.family),
  );
  const families = [...new Set(all.map((c) => c.family as string))];
  const selected = all.find((c) => c.id === first(params.c)) ?? null;
  const from = (query.page - 1) * COLOURS_PER_PAGE;

  return (
    <ColourBrowser
      basePath="/styleguide/colours"
      productBase="/shop"
      query={query}
      families={families}
      colours={matches.slice(from, from + COLOURS_PER_PAGE)}
      total={matches.length}
      closest={query.hex ? closestFrom(all, query.hex, 8) : null}
      selected={selected}
      products={selected ? [{ id: "p1", name: "بنتلايت داخلي ممتاز", kind: "ready" }, { id: "p2", name: "دهان مخلوط", kind: "mixed" }] : []}
    />
  );
}
