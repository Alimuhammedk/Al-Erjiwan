"use client";

import { localised } from "@/lib/i18n/lang";

import Image from "next/image";
import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";

const step = "grid size-11 place-items-center rounded-full border-2 border-brand-100 font-bold text-brand-900 hover:bg-brand-50";

export function CartView() {
  const m = useMessages();
  const { items, setQty, remove, total } = useCart();
  const t = m.cart;

  if (items.length === 0) {
    return (
      <div className="space-y-5 rounded-2xl border border-dashed border-brand-100 bg-brand-50 px-4 py-14 text-center">
        <p className="text-lg text-brand-700">{t.empty}</p>
        <Link href="/shop" className="inline-block rounded-full bg-brand-700 px-6 py-3 font-bold text-white">
          {t.continueShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <ul className="divide-y divide-brand-100 rounded-2xl border border-brand-100 bg-paper">
        {items.map((i) => (
          <li key={i.key} className="flex gap-4 p-4">
            <Link href={`/shop/${i.product_id}`} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-brand-50">
              {i.image_url && <Image src={i.image_url} alt="" fill sizes="80px" className="object-cover" />}
            </Link>
            <div className="min-w-0 flex-1 space-y-1">
              <Link href={`/shop/${i.product_id}`} className="block break-words font-bold text-brand-900">
                {localised(m.lang, i.name, i.name_en)}
              </Link>
              {i.size_label && (
                <p className="text-sm text-ink/70">
                  {t.size}: {i.size_label}
                </p>
              )}
              {(i.colour_name || i.colour_note) && (
                <p className="text-sm text-ink/70">
                  {t.colour}: {[localised(m.lang, i.colour_name, i.colour_name_en), i.colour_note].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="font-extrabold text-brand-700">{formatPrice(i.unit_price * i.quantity, m.common.currency)}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button type="button" aria-label={t.decrease} onClick={() => setQty(i.key, i.quantity - 1)} disabled={i.quantity <= 1} className={`${step} disabled:opacity-30`}>
                  −
                </button>
                <span className="min-w-8 text-center font-bold" aria-live="polite">
                  {i.quantity}
                </span>
                <button type="button" aria-label={t.increase} onClick={() => setQty(i.key, i.quantity + 1)} className={step}>
                  +
                </button>
                <button type="button" onClick={() => remove(i.key)} className="ms-auto min-h-11 min-w-11 px-3 text-sm font-bold text-coral-500">
                  {t.remove}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <aside className="h-fit space-y-4 rounded-2xl border border-brand-100 bg-paper p-5">
        <p className="flex items-baseline justify-between text-lg">
          <span className="font-semibold text-brand-900">{t.total}</span>
          <span className="text-2xl font-extrabold text-brand-700">{formatPrice(total, m.common.currency)}</span>
        </p>
        <p className="text-sm text-ink/70">{t.deliveryNote}</p>
        <Link href="/checkout" className="block w-full rounded-full bg-brand-700 px-6 py-3 text-center font-bold text-white hover:bg-brand-900">
          {t.checkout}
        </Link>
        <Link href="/shop" className="block text-center font-bold text-brand-700">
          {t.continueShopping}
        </Link>
      </aside>
    </div>
  );
}
