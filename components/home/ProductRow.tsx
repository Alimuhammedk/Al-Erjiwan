import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { ProductCard } from "@/components/ui/ProductCard";
import type { ProductWithImage } from "@/types/db";

export function ProductRow({
  title,
  products,
  emptyMessage,
}: {
  title: string;
  products: ProductWithImage[];
  emptyMessage: string;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-12">
      <h2 className="mb-5 text-2xl font-extrabold text-brand-900">{title}</h2>
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
