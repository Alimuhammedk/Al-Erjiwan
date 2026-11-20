import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";
import type { OrderSummary } from "@/lib/data/orders";
import { formatPrice } from "@/lib/format";
import { customerStatusLabel } from "@/lib/shop/status";
import { CopyCode } from "./CopyCode";


// What the customer sees right after ordering. Shown by the real page and by the dev-only sample page.
export async function OrderConfirmationView({ code, summary }: { code: string; summary: OrderSummary }) {
  const m = await getMessages();
  const t = m.order;
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10">
      <div className="space-y-3 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-700 text-white" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h1 className="text-3xl font-extrabold text-brand-900">{t.receivedTitle}</h1>
        <p className="leading-8 text-ink/80">{t.receivedText}</p>
      </div>

      <section className="space-y-4 rounded-2xl border border-brand-100 bg-brand-50 p-5 text-center">
        <p className="text-sm text-ink/70">{t.number}</p>
        <p dir="ltr" className="select-all text-4xl font-extrabold tracking-widest text-brand-900">
          {code}
        </p>
        <CopyCode code={code} />
        <p className="text-sm text-ink/70">{t.keepNumber}</p>
        <p className="inline-block rounded-full bg-brand-700 px-4 py-1 text-sm font-bold text-white">
          {t.status}: {customerStatusLabel(summary.status, m.order.statuses)}
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-brand-100 bg-paper p-5">
        <h2 className="text-lg font-extrabold text-brand-900">{t.items}</h2>
        <ul className="divide-y divide-brand-100">
          {summary.items.map((i, n) => (
            <li key={n} className="flex justify-between gap-3 py-2">
              <span className="min-w-0 break-words">
                {i.name}
                {i.size ? ` (${i.size})` : ""}
              </span>
              <span className="shrink-0 font-bold">× {i.quantity}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t border-brand-100 pt-3 text-lg">
          <span className="font-bold text-brand-900">{t.total}</span>
          <span className="font-extrabold text-brand-700">{formatPrice(summary.total, m.common.currency)}</span>
        </p>
      </section>

      <div className="flex flex-col gap-3">
        <Link href="/track" className="rounded-full bg-brand-700 px-6 py-3 text-center font-bold text-white hover:bg-brand-900">
          {t.track}
        </Link>
        <Link href="/shop" className="text-center font-bold text-brand-700">
          {t.continueShopping}
        </Link>
      </div>
    </main>
  );
}
