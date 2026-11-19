import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { displayPrice } from "@/lib/shop/product";
import type { ProductWithImage } from "@/types/db";

// No "sold out" badge here: a sized product's stock lives on its sizes, which the card doesn't load.
// The product page shows the real stock.
export function ProductCard({ product }: { product: ProductWithImage }) {
  const { price, oldPrice } = displayPrice(product);
  return (
    <Link
      href={`/shop/${product.id}`}
      className="group block overflow-hidden rounded-2xl border border-brand-100 bg-paper"
    >
      <div className="relative aspect-square overflow-hidden bg-brand-50">
        {product.image_url && (
          <Image
            src={product.image_url}
            alt={product.name_ar}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 break-words font-bold text-brand-900">{product.name_ar}</h3>
        <p className="flex flex-wrap items-baseline gap-2">
          <span className="font-extrabold text-brand-700">{formatPrice(price)}</span>
          {oldPrice !== null && <span className="text-sm text-ink/50 line-through">{formatPrice(oldPrice)}</span>}
        </p>
      </div>
    </Link>
  );
}
