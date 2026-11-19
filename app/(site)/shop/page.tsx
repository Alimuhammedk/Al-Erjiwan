import type { Metadata } from "next";
import { Pagination } from "@/components/shop/Pagination";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/components/ui/ProductCard";
import { getMessages } from "@/lib/i18n/messages";
import { getFilterOptions, getShopProducts } from "@/lib/data/shop";
import { parseShopQuery } from "@/lib/shop/query";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: `${m.shop.title} | ${m.siteName}`, description: m.tagline, alternates: { canonical: "/shop" } };
}
export const dynamic = "force-dynamic";

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = await getMessages();
  const query = parseShopQuery(await searchParams);
  const [{ products, total }, options] = await Promise.all([getShopProducts(query), getFilterOptions()]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brand-900">{m.shop.title}</h1>
      <ShopFilters query={query} categories={options.categories} brands={options.brands} />
      <p className="text-sm text-ink/70">
        {total} {m.shop.results}
      </p>
      {products.length === 0 ? (
        <EmptyState message={m.shop.noResults} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      <Pagination query={query} total={total} />
    </main>
  );
}
