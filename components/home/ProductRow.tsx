import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { ProductCard } from "@/components/ui/ProductCard";
import { ar } from "@/content/ar";
import type { ProductWithImage } from "@/types/db";

export function ProductRow({
  title,
  products,
  emptyMessage,
  href = "/shop",
}: {
  title: string;
  products: ProductWithImage[];
  emptyMessage: string;
  href?: string;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-12">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-extrabold text-brand-900">{title}</h2>
        {products.length > 0 && (
          <Link href={href} className="inline-flex min-h-11 items-center font-bold text-brand-700 hover:underline">
            {ar.common.viewAll}
          </Link>
        )}
      </div>
      {products.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <FadeIn className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </FadeIn>
      )}
    </section>
  );
}
