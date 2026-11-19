import Link from "next/link";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ar } from "@/content/ar";
import { ORDERS_PER_PAGE, STATUS_ORDER, parseOrderListQuery, type OrderListQuery } from "@/lib/admin/orders";
import { listOrders } from "@/lib/admin/orders-data";
import { deleteOrderAction } from "./actions";
import { formatDateTime, formatPrice } from "@/lib/format";

const t = ar.admin.orders;

function href(q: OrderListQuery, patch: Partial<OrderListQuery>): string {
  const n = { ...q, ...patch };
  const p = new URLSearchParams();
  if (n.status) p.set("status", n.status);
  if (n.q) p.set("q", n.q);
  if (n.page > 1) p.set("page", String(n.page));
  const s = p.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseOrderListQuery(await searchParams);
  const { orders, total } = await listOrders(query);
  const pages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
  const tab = "inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-6">
      <h1 className="text-2xl font-extrabold text-brand-900">{t.title}</h1>

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label={t.title}>
        {[null, ...STATUS_ORDER].map((s) => (
          <Link
            key={s ?? "all"}
            href={href(query, { status: s, page: 1 })}
            aria-current={query.status === s ? "page" : undefined}
            className={`${tab} ${query.status === s ? "bg-brand-700 text-white" : "bg-paper text-brand-700 hover:bg-brand-50"}`}
          >
            {s ? (t.statuses as Record<string, string>)[s] : t.all}
          </Link>
        ))}
      </nav>

      <form method="get" action="/admin/orders" className="flex gap-2">
        {query.status && <input type="hidden" name="status" value={query.status} />}
        <input
          type="search"
          name="q"
          defaultValue={query.q}
          maxLength={40}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
          className="h-11 min-w-0 flex-1 rounded-xl border border-brand-100 bg-paper px-4 focus:border-brand-500 focus:outline-none"
        />
        <button type="submit" className="min-h-11 rounded-full bg-brand-700 px-6 font-bold text-white hover:bg-brand-900">
          {t.search}
        </button>
      </form>

      {orders.length === 0 ? (
        <p className="rounded-2xl bg-paper p-8 text-center text-brand-700">{t.empty}</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center gap-2">
              <Link
                href={`/admin/orders/${o.id}`}
                className={`flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-paper p-4 shadow-sm transition-shadow hover:shadow-md ${o.status === "new" ? "border-s-4 border-coral-500" : ""}`}
              >
                <span dir="ltr" className="font-extrabold tracking-widest text-brand-900">
                  {o.code}
                </span>
                <StatusBadge status={o.status} />
                <span className="min-w-0 flex-1 break-words font-bold text-brand-900">
                  {o.customer_name} · <span className="font-normal text-ink/70">{o.governorate}</span>
                </span>
                <span className="font-extrabold text-brand-700">{formatPrice(o.total)}</span>
                <span className="w-full text-sm text-ink/70 sm:w-auto">{formatDateTime(o.created_at)}</span>
              </Link>
              <DeleteOrderButton code={o.code} status={o.status} deleteOrder={deleteOrderAction.bind(null, o.id)} after="refresh" className="shrink-0" />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-4 pt-2">
          {query.page > 1 && (
            <Link href={href(query, { page: query.page - 1 })} className="min-h-11 rounded-full border-2 border-brand-700 px-5 py-2 font-bold text-brand-700">
              {t.prev}
            </Link>
          )}
          <span className="text-sm text-ink/70">
            {query.page} / {pages}
          </span>
          {query.page < pages && (
            <Link href={href(query, { page: query.page + 1 })} className="min-h-11 rounded-full border-2 border-brand-700 px-5 py-2 font-bold text-brand-700">
              {t.next}
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
