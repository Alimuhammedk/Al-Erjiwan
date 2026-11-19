import type { Metadata } from "next";
import { inputClass } from "@/components/admin/FormField";
import { ar } from "@/content/ar";
import { trackOrder } from "@/lib/data/orders";
import { formatDateTime, formatPrice } from "@/lib/format";
import { customerStatusLabel, timeline } from "@/lib/shop/status";

export const metadata: Metadata = { title: `${ar.track.title} | ${ar.siteName}`, robots: { index: false } };
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function TrackPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const code = first(params.code).slice(0, 20);
  const phone = first(params.phone).slice(0, 30);
  const searched = code.trim() !== "" && phone.trim() !== "";
  const order = searched ? await trackOrder(code, phone) : null;
  const t = ar.track;
  const line = order ? timeline(order.status) : null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10">
      <h1 className="text-3xl font-extrabold text-brand-900">{t.title}</h1>
      <p className="text-ink/80">{t.intro}</p>

      <form method="get" action="/track" className="space-y-4 rounded-2xl border border-brand-100 bg-paper p-5">
        <label className="block">
          <span className="mb-1 block font-semibold text-brand-900">{t.code}</span>
          <input name="code" defaultValue={code} dir="ltr" maxLength={20} autoCapitalize="characters" className={`${inputClass} text-start uppercase tracking-widest`} />
        </label>
        <label className="block">
          <span className="mb-1 block font-semibold text-brand-900">{t.phone}</span>
          <input name="phone" type="tel" inputMode="tel" defaultValue={phone} dir="ltr" maxLength={30} className={`${inputClass} text-start`} />
        </label>
        <button type="submit" className="min-h-11 rounded-full bg-brand-700 px-8 py-2.5 font-bold text-white hover:bg-brand-900">
          {t.search}
        </button>
      </form>

      {searched && !order && (
        <p role="status" className="rounded-2xl bg-coral-500/10 px-4 py-4 font-semibold text-coral-500">
          {t.notFound}
        </p>
      )}

      {order && line && (
        <section className="space-y-5 rounded-2xl border border-brand-100 bg-paper p-5" aria-live="polite">
          {line.ended ? (
            <p className="inline-block rounded-full bg-coral-500 px-5 py-2 text-lg font-extrabold text-white">{customerStatusLabel(line.ended)}</p>
          ) : (
            <ol className="grid grid-cols-4 gap-2 text-center">
              {line.steps.map((s) => (
                <li key={s.key} aria-current={s.state === "current" ? "step" : undefined} className="space-y-2">
                  <span
                    className={`mx-auto grid size-9 place-items-center rounded-full text-sm font-bold ${
                      s.state === "done" ? "bg-brand-700 text-white" : s.state === "current" ? "bg-coral-500 text-white ring-4 ring-coral-500/25" : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    {s.state === "done" ? "✓" : ""}
                  </span>
                  <span className={`block text-xs sm:text-sm ${s.state === "todo" ? "text-ink/60" : "font-bold text-brand-900"}`}>{s.label}</span>
                </li>
              ))}
            </ol>
          )}

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink/70">{t.placed}</dt>
              <dd className="font-semibold">{formatDateTime(order.created_at)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/70">{t.updated}</dt>
              <dd className="font-semibold">{formatDateTime(order.updated_at)}</dd>
            </div>
            {order.delivery_company && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink/70">{t.deliveryCompany}</dt>
                <dd className="font-semibold">{order.delivery_company}</dd>
              </div>
            )}
          </dl>

          <ul className="divide-y divide-brand-100 border-t border-brand-100">
            {order.items.map((i, n) => (
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
            <span className="font-bold text-brand-900">{ar.order.total}</span>
            <span className="font-extrabold text-brand-700">{formatPrice(order.total)}</span>
          </p>
        </section>
      )}
    </main>
  );
}
