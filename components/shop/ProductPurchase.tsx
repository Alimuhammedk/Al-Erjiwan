"use client";

import { useState } from "react";
import { ar } from "@/content/ar";
import { useCart } from "@/lib/cart/CartProvider";
import type { ProductDetail } from "@/lib/data/shop";
import { formatPrice } from "@/lib/format";
import { displayPrice, isSoldOut, stockFor } from "@/lib/shop/product";

type Variant = ProductDetail["variants"][number];

export function ProductPurchase({ detail }: { detail: ProductDetail }) {
  const { product, images, variants, colours } = detail;
  const t = ar.product;
  const { add } = useCart();

  const variantColours = !product.is_tintable && variants.some((v) => v.colour_id);
  const [colourId, setColourId] = useState<string | null>(
    variantColours ? (variants.find((v) => v.stock > 0)?.colour_id ?? variants[0]?.colour_id ?? null) : null,
  );
  const sizeOptions = variantColours ? variants.filter((v) => v.colour_id === colourId) : variants;
  const [variantId, setVariantId] = useState<string | null>(
    (sizeOptions.find((v) => v.stock > 0) ?? sizeOptions[0])?.id ?? null,
  );
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const variant: Variant | null = sizeOptions.find((v) => v.id === variantId) ?? null;
  const { price, oldPrice } = displayPrice(product, variant);
  const stock = stockFor(product, variant);
  const soldOut = isSoldOut(product, sizeOptions, variant);

  function pickColour(id: string) {
    setColourId(id);
    if (variantColours) {
      const options = variants.filter((v) => v.colour_id === id);
      setVariantId((options.find((v) => v.stock > 0) ?? options[0])?.id ?? null);
    }
  }

  function addToCart() {
    if (variants.length > 0 && !variant) return setMessage({ text: t.chooseSize, ok: false });
    if (product.is_tintable && !colourId && !note.trim()) return setMessage({ text: t.chooseColour, ok: false });
    add({
      product_id: product.id,
      variant_id: variant?.id ?? null,
      colour_id: product.is_tintable ? colourId : (variant?.colour_id ?? null),
      colour_note: product.is_tintable ? note.trim() || null : null,
      name: product.name_ar,
      size_label: variant?.size_label ?? null,
      unit_price: price,
      image_url: images[0] ?? null,
      quantity,
    });
    setMessage({ text: t.added, ok: true });
  }

  const swatchColours = variantColours ? colours.filter((c) => variants.some((v) => v.colour_id === c.id)) : colours;
  const chosenColour = swatchColours.find((c) => c.id === colourId);

  return (
    <div className="space-y-5">
      <p className="flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-extrabold text-brand-700">{formatPrice(price)}</span>
        {oldPrice !== null && <span className="text-lg text-ink/50 line-through">{formatPrice(oldPrice)}</span>}
      </p>

      {swatchColours.length > 0 && (
        <div>
          <p className="mb-2 font-semibold text-brand-900">
            {t.colours}
            {chosenColour && <span className="ms-2 font-normal text-ink/70">{chosenColour.name_ar}</span>}
          </p>
          <ul className="flex flex-wrap gap-2">
            {swatchColours.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pickColour(c.id)}
                  aria-label={c.name_ar}
                  aria-pressed={c.id === colourId}
                  style={{ backgroundColor: c.hex }}
                  className={`size-10 rounded-full border-2 ${c.id === colourId ? "border-brand-900 ring-2 ring-brand-500" : "border-brand-100"}`}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {product.is_tintable && (
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-900">{t.colourNote}</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={100}
            className="w-full rounded-xl border border-brand-100 bg-paper px-4 py-2.5 focus:border-brand-500 focus:outline-none"
          />
        </label>
      )}

      {sizeOptions.length > 0 && (
        <div>
          <p className="mb-2 font-semibold text-brand-900">{t.sizes}</p>
          <ul className="flex flex-wrap gap-2">
            {sizeOptions.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  disabled={v.stock <= 0}
                  onClick={() => setVariantId(v.id)}
                  aria-pressed={v.id === variantId}
                  className={`rounded-full border-2 px-5 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
                    v.id === variantId ? "border-brand-700 bg-brand-700 text-white" : "border-brand-100 text-brand-900 hover:border-brand-500"
                  }`}
                >
                  {v.size_label}
                  {v.stock <= 0 && <span className="ms-2 text-xs font-normal">{t.soldOut}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className={`font-semibold ${soldOut ? "text-coral-500" : "text-brand-700"}`}>
        {soldOut ? t.soldOut : stock <= 5 ? t.lowStock : t.inStock}
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-900">{t.quantity}</span>
          <input
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(e) => setQuantity(Math.min(99, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
            className="w-24 rounded-xl border border-brand-100 bg-paper px-3 py-2.5"
          />
        </label>
        <button
          type="button"
          onClick={addToCart}
          disabled={soldOut}
          className="rounded-full bg-brand-700 px-8 py-3 font-bold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {soldOut ? t.soldOut : t.addToCart}
        </button>
      </div>
      {message && (
        <p role="status" className={`font-semibold ${message.ok ? "text-brand-700" : "text-coral-500"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
