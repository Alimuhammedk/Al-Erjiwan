import type { Metadata } from "next";
import { ColourBrowser } from "@/components/colours/ColourBrowser";
import { ar } from "@/content/ar";
import { parseColourQuery } from "@/lib/colours/query";
import { getColourById, getColourPage, productsForColour } from "@/lib/data/colours";

export const metadata: Metadata = { title: `${ar.colours.title} | ${ar.siteName}` };
export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ColoursPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = parseColourQuery(params);
  const [data, selected] = await Promise.all([getColourPage(query), getColourById(first(params.c))]);
  const products = selected ? await productsForColour(selected.id) : [];

  return (
    <ColourBrowser
      basePath="/colours"
      productBase="/shop"
      query={query}
      families={data.families}
      colours={data.colours}
      total={data.total}
      closest={data.closest}
      selected={selected}
      products={products}
    />
  );
}
