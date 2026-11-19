import Image from "next/image";
import { ar } from "@/content/ar";
import { formatPrice } from "@/lib/format";
import type { ProductWithImage } from "@/types/db";

export function ProductCard({ product }: { product: ProductWithImage }) {
  const onSale = product.sale_price !== null && product.sale_price < product.base_price;
  return (
    <article className="group overflow-hidden rounded-2xl border border-brand-100 bg-paper">
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
        {product.stock <= 0 && (
          <span className="absolute start-2 top-2 rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">
            {ar.common.outOfStock}
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 break-words font-bold text-brand-900">{product.name_ar}</h3>
        <p className="flex flex-wrap items-baseline gap-2">
          <span className="font-extrabold text-brand-700">
            {formatPrice(onSale ? product.sale_price! : product.base_price)}
          </span>
          {onSale && <span className="text-sm text-ink/50 line-through">{formatPrice(product.base_price)}</span>}
        </p>
      </div>
    </article>
  );
}
