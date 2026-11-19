"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { placeOrderAction } from "@/app/(site)/checkout/actions";
import { FormField, inputClass } from "@/components/admin/FormField";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useFormAction } from "@/components/admin/useFormAction";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { useCart } from "@/lib/cart/CartProvider";
import type { DeliveryZone } from "@/lib/data/orders";
import { formatPrice } from "@/lib/format";
import { cartToOrderItems } from "@/lib/shop/orders";

const t = ar.checkout;

export function CheckoutForm({ zones }: { zones: DeliveryZone[] }) {
  const { items, total, ready } = useCart();
  const router = useRouter();
  const { state, onSubmit, pending } = useFormAction(placeOrderAction, {} as ActionState);
  const [governorate, setGovernorate] = useState("");
  const err = state.errors ?? {};
  const zone = zones.find((z) => z.governorate_ar === governorate);

  // Nothing to order: go back to the cart (only once the saved cart has been read from this browser).
  useEffect(() => {
    if (ready && items.length === 0) router.replace("/cart");
  }, [ready, items.length, router]);

  if (!ready || items.length === 0) return null;

  const feeText = zone ? (zone.fee === 0 ? t.free : formatPrice(zone.fee)) : t.deliveryPending;
  const belowMinimum = zone !== undefined && zone.min_order > total;

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <input type="hidden" name="items" value={JSON.stringify(cartToOrderItems(items))} />

      <section className="space-y-5 rounded-2xl border border-brand-100 bg-paper p-5 sm:p-6">
        <h2 className="text-xl font-extrabold text-brand-900">{t.yourDetails}</h2>
        {zones.length === 0 && <p role="alert" className="rounded-xl bg-coral-500/10 px-4 py-3 font-semibold text-coral-500">{t.unavailableZones}</p>}

        <FormField label={t.name} error={err.customer_name}>
          <input name="customer_name" autoComplete="name" maxLength={100} className={inputClass} />
        </FormField>
        <FormField label={t.phone} error={err.phone}>
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={25} className={`${inputClass} text-start`} />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t.governorate} error={err.governorate}>
            <select name="governorate" value={governorate} onChange={(e) => setGovernorate(e.target.value)} className={inputClass}>
              <option value="">{t.chooseGovernorate}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.governorate_ar} data-fee={z.fee}>
                  {z.governorate_ar}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t.city} error={err.city}>
            <input name="city" autoComplete="address-level2" maxLength={100} className={inputClass} />
          </FormField>
        </div>
        <FormField label={t.landmark} error={err.landmark}>
          <input name="landmark" maxLength={150} className={inputClass} />
        </FormField>
        <FormField label={t.notes} error={err.notes}>
          <textarea name="notes" rows={2} maxLength={500} className={inputClass} />
        </FormField>
      </section>

      <aside className="h-fit space-y-4 rounded-2xl border border-brand-100 bg-paper p-5">
        <h2 className="text-xl font-extrabold text-brand-900">{t.summary}</h2>
        <ul className="divide-y divide-brand-100">
          {items.map((i) => (
            <li key={i.key} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="break-words font-bold text-brand-900">{i.name}</p>
                <p className="text-ink/70">{[...[i.size_label, i.colour_name, i.colour_note].filter(Boolean), `× ${i.quantity}`].join(" · ")}</p>
              </div>
              <span className="shrink-0 font-bold text-brand-700">{formatPrice(i.unit_price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-ink/80">{t.subtotal}</dt>
            <dd className="font-semibold">{formatPrice(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink/80">{t.delivery}</dt>
            <dd className="font-semibold">{feeText}</dd>
          </div>
          <div className="flex justify-between border-t border-brand-100 pt-3 text-lg">
            <dt className="font-bold text-brand-900">{t.total}</dt>
            <dd data-testid="checkout-total" className="font-extrabold text-brand-700">
              {formatPrice(total + (zone?.fee ?? 0))}
            </dd>
          </div>
        </dl>
        {belowMinimum && (
          <p role="status" className="rounded-xl bg-coral-500/10 px-3 py-2 text-sm font-semibold text-coral-500">
            {t.minOrderHint.replace("{amount}", formatPrice(zone.min_order))}
          </p>
        )}
        <p className="text-sm text-ink/70">{t.payOnDelivery}. {t.previewNote}</p>
        {state.error && (
          <p role="alert" className="rounded-xl bg-coral-500/10 px-3 py-2 font-semibold text-coral-500">
            {state.error}
          </p>
        )}
        <SubmitButton label={t.place} pending={pending} />
        <Link href="/cart" className="block text-center font-bold text-brand-700">
          {t.backToCart}
        </Link>
      </aside>
    </form>
  );
}
