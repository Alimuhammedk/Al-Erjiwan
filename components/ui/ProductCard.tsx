import { localised } from "@/lib/i18n/lang";
import Image from "next/image";
import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";
import { formatPrice } from "@/lib/format";
import { discountPercent, displayPrice } from "@/lib/shop/product";
import type { ProductWithImage } from "@/types/db";

const sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

// No "sold out" badge here: a sized product's stock lives on its sizes, which the card doesn't load.
// The product page shows the real stock.
export async function ProductCard({ product }: { product: ProductWithImage }) {
  const m = await getMessages();
  const name = localised(m.lang, product.name_ar, product.name_en);
  const { price, oldPrice } = displayPrice(product);
  const percent = oldPrice !== null ? discountPercent(oldPrice, price) : null;
  return (
    <Link
      href={`/shop/${product.id}`}
      className="group block overflow-hidden rounded-2xl border border-brand-100 bg-paper shadow-sm transition-all duration-300 hover:shadow-xl motion-safe:hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden bg-brand-50">
        {product.image_url && (
          <Image
            src={product.image_url}
            alt={name}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {product.hover_image_url && (
          <Image
            src={product.hover_image_url}
            alt=""
            fill
            sizes={sizes}
            loading="lazy"
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
        {percent !== null && (
          <span className="absolute start-2 top-2 z-10 rounded-full bg-coral-500 px-3 py-1 text-xs font-bold text-white shadow">
            {m.common.discount.replace("{n}", String(percent))}
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 break-words font-bold text-brand-900">{name}</h3>
        <p className="flex flex-wrap items-baseline gap-2">
          <span className="font-extrabold text-brand-700">{formatPrice(price, m.common.currency)}</span>
          {oldPrice !== null && <span className="text-sm text-ink/70 line-through">{formatPrice(oldPrice, m.common.currency)}</span>}
        </p>
      </div>
    </Link>
  );
}
