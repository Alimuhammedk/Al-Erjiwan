import Link from "next/link";
import { ar } from "@/content/ar";
import type { DashboardStats } from "@/lib/admin/dashboard";
import type { OrderRow } from "@/lib/admin/orders-data";
import { STATUS_ORDER } from "@/lib/admin/orders";
import { formatDateTime, formatPrice } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

const t = ar.admin.dashboard;
const labels = ar.admin.orders.statuses as Record<string, string>;

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`space-y-3 rounded-2xl bg-paper p-5 ${className}`}>
      <h2 className="text-lg font-extrabold text-brand-900">{title}</h2>
      {children}
    </section>
  );
}

function Number({ label, value, note, testId }: { label: string; value: string; note?: string; testId: string }) {
  return (
    <div className="rounded-2xl bg-paper p-5">
      <p className="text-sm text-ink/70">{label}</p>
      <p data-testid={testId} className="text-3xl font-extrabold text-brand-900">
        {value}
      </p>
      {note && <p className="text-xs text-ink/60">{note}</p>}
    </div>
  );
}

// The admin home: orders per status, today's and this month's sales, stock health, best sellers and the latest orders.
// Shown by the real page and by the dev-only sample page.
export function DashboardView({ stats, latest }: { stats: DashboardStats | null; latest: OrderRow[] }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-6">
      <h1 className="text-2xl font-extrabold text-brand-900">{t.title}</h1>

      {!stats ? (
        <p role="alert" className="rounded-2xl bg-coral-500/10 p-5 font-semibold text-coral-500">
          {t.unavailable}
        </p>
      ) : (
        <>
          <Card title={t.orders}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {STATUS_ORDER.map((s) => (
                <li key={s}>
                  <Link
                    href={`/admin/orders?status=${s}`}
                    data-testid={`status-${s}`}
                    className={`flex min-h-20 flex-col justify-between rounded-xl border-2 p-3 hover:bg-brand-50 ${
                      s === "new" && stats.byStatus[s] > 0 ? "border-coral-500" : "border-brand-100"
                    }`}
                  >
                    <span className="text-sm font-semibold text-ink/80">{labels[s]}</span>
                    <span className="text-3xl font-extrabold text-brand-900">{stats.byStatus[s]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3">
            <Number label={t.ordersToday} value={String(stats.ordersToday)} testId="orders-today" />
            <Number label={t.salesToday} value={formatPrice(stats.salesToday)} note={t.salesNote} testId="sales-today" />
            <Number label={t.salesMonth} value={formatPrice(stats.salesMonth)} note={t.salesNote} testId="sales-month" />
          </div>

          <Card title={t.stock}>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-emerald-600 p-3 text-white">
                <p className="text-sm">{t.available}</p>
                <p data-testid="stock-available" className="text-3xl font-extrabold">
                  {stats.stock.available}
                </p>
              </div>
              <div className="rounded-xl bg-orange-400 p-3 text-ink">
                <p className="text-sm">{t.low}</p>
                <p data-testid="stock-low" className="text-3xl font-extrabold">
                  {stats.stock.low}
                </p>
              </div>
              <div className="rounded-xl bg-coral-500 p-3 text-white">
                <p className="text-sm">{t.out}</p>
                <p data-testid="stock-out" className="text-3xl font-extrabold">
                  {stats.stock.out}
                </p>
              </div>
            </div>
            {stats.lowStock.length === 0 ? (
              <p className="text-brand-700">{t.allGood}</p>
            ) : (
              <>
                <h3 className="font-bold text-brand-900">{t.needsAttention}</h3>
                <ul className="divide-y divide-brand-100" data-testid="low-stock-list">
                  {stats.lowStock.map((p, n) => (
                    <li key={n} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 break-words font-semibold">
                        {p.name}
                        {p.size && <span className="font-normal text-ink/70"> · {p.size}</span>}
                      </span>
                      <span className={`shrink-0 rounded-full px-3 py-0.5 text-sm font-bold ${p.stock <= 0 ? "bg-coral-500 text-white" : "bg-orange-400 text-ink"}`}>
                        {p.stock <= 0 ? ar.admin.stock.level.out : p.stock}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Link href="/admin/stock" className="inline-flex min-h-11 items-center font-bold text-brand-700 underline">
              {t.openStock}
            </Link>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title={t.bestSellers}>
              {stats.bestSellers.length === 0 ? (
                <p className="text-ink/70">{t.noSales}</p>
              ) : (
                <ol className="divide-y divide-brand-100" data-testid="best-sellers">
                  {stats.bestSellers.map((b, n) => (
                    <li key={n} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 break-words font-semibold">
                        {n + 1}. {b.name}
                      </span>
                      <span className="shrink-0 font-bold text-brand-700">
                        {b.quantity} {t.piece}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card title={t.latest}>
              {latest.length === 0 ? (
                <p className="text-ink/70">{t.noOrders}</p>
              ) : (
                <ul className="divide-y divide-brand-100" data-testid="latest-orders">
                  {latest.map((o) => (
                    <li key={o.id}>
                      <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 hover:bg-brand-50">
                        <span dir="ltr" className="font-extrabold tracking-widest text-brand-900">
                          {o.code}
                        </span>
                        <StatusBadge status={o.status} />
                        <span className="min-w-0 flex-1 break-words">{o.customer_name}</span>
                        <span className="font-bold text-brand-700">{formatPrice(o.total)}</span>
                        <span className="w-full text-xs text-ink/60">{formatDateTime(o.created_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/orders" className="inline-flex min-h-11 items-center font-bold text-brand-700 underline">
                {t.viewAll}
              </Link>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
