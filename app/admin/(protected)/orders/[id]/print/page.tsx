import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/PrintButton";
import { ar } from "@/content/ar";
import { getOrder } from "@/lib/admin/orders-data";
import { formatDateTime, formatPrice } from "@/lib/format";

const t = ar.admin.orders;

// A plain slip to print and hand to the delivery person. The admin menu and buttons are hidden when printing.
export default async function OrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 bg-paper px-6 py-8 print:max-w-none print:p-0">
      <PrintButton />
      <header className="flex items-start justify-between gap-4 border-b-2 border-ink pb-3">
        <div>
          <p className="text-xl font-extrabold">{ar.siteName}</p>
          <p className="text-sm">{formatDateTime(order.created_at)}</p>
        </div>
        <p dir="ltr" className="text-3xl font-extrabold tracking-widest">{order.code}</p>
      </header>

      <dl className="space-y-1.5 text-lg">
        <p><b>{t.name}:</b> {order.customer_name}</p>
        <p><b>{t.phone}:</b> <span dir="ltr">{order.phone}</span></p>
        <p><b>{t.governorate}:</b> {[order.governorate, order.city].filter(Boolean).join(" - ")}</p>
        <p><b>{t.address}:</b> {order.address}</p>
        {order.landmark && <p><b>{t.landmark}:</b> {order.landmark}</p>}
        {order.notes && <p><b>{t.notes}:</b> {order.notes}</p>}
      </dl>

      <ul className="divide-y divide-ink/30 border-y border-ink/30">
        {order.items.map((i, n) => (
          <li key={n} className="flex justify-between gap-3 py-2">
            <span>
              {i.product_name ?? "—"}
              {i.size_label ? ` (${i.size_label})` : ""}
              {[i.colour_name, i.colour_code].filter(Boolean).length ? ` ${[i.colour_name, i.colour_code].filter(Boolean).join(" ")}` : i.colour_note ? ` ${i.colour_note}` : ""}
            </span>
            <b>× {i.quantity}</b>
          </li>
        ))}
      </ul>

      <p className="rounded-xl border-4 border-ink p-4 text-center">
        <span className="block text-base">{t.collect}</span>
        <span className="text-4xl font-extrabold">{formatPrice(order.total)}</span>
      </p>
    </main>
  );
}
