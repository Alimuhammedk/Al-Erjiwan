import Link from "next/link";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { customerWhatsAppUrl, deliveryMessage, deliveryWhatsAppUrl, type AdminOrder } from "@/lib/admin/orders";
import { formatDateTime, formatPrice } from "@/lib/format";
import { CopyButton } from "./CopyButton";
import { NotesForm } from "./NotesForm";
import { OrderActions } from "./OrderActions";
import { StatusBadge } from "./StatusBadge";

const t = ar.admin.orders;

type Props = {
  order: AdminOrder;
  problemCount: number;
  printHref: string;
  setStatus: (status: string) => Promise<ActionState>;
  saveNotes: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  deleteOrder: () => Promise<ActionState>;
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl bg-paper p-5">
      <h2 className="text-lg font-extrabold text-brand-900">{title}</h2>
      {children}
    </section>
  );
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
    <dt className="text-ink/70">{label}</dt>
    <dd className="min-w-0 break-words font-semibold">{children}</dd>
  </div>
);

const button = "inline-flex min-h-11 items-center justify-center rounded-full px-5 font-bold";

// The whole order page. The pieces that change data come in as actions, so the same page can be shown with sample data.
export function OrderDetailView({ order, problemCount, printHref, setStatus, saveNotes, deleteOrder }: Props) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-6">
      <Link href="/admin/orders" className="inline-flex min-h-11 items-center font-bold text-brand-700 print:hidden">
        ← {t.back}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 dir="ltr" className="text-3xl font-extrabold tracking-widest text-brand-900">
          {order.code}
        </h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-ink/70">
          {t.placed}: {formatDateTime(order.created_at)}
        </span>
      </div>

      {problemCount > 0 && (
        <p role="alert" className="rounded-xl border-2 border-orange-400 bg-orange-400/15 px-4 py-3 font-bold text-ink">
          {t.problemWarning.replace("{n}", String(problemCount))}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-5">
          <Card title={t.customer}>
            <dl className="space-y-2">
              <Row label={t.name}>{order.customer_name}</Row>
              <Row label={t.phone}>
                <a href={`tel:${order.phone}`} dir="ltr" className="inline-flex min-h-11 items-center text-brand-700 underline">
                  {order.phone}
                </a>
              </Row>
              <Row label={t.governorate}>{order.governorate}</Row>
              {order.city && <Row label={t.city}>{order.city}</Row>}
              <Row label={t.address}>{order.address}</Row>
              {order.landmark && <Row label={t.landmark}>{order.landmark}</Row>}
              {order.notes && <Row label={t.notes}>{order.notes}</Row>}
            </dl>
            <a href={`tel:${order.phone}`} className={`${button} border-2 border-brand-700 text-brand-700 hover:bg-brand-50`}>
              {t.call}
            </a>
          </Card>

          <Card title={t.items}>
            <ul className="divide-y divide-brand-100">
              {order.items.map((i, n) => (
                <li key={n} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="break-words font-bold text-brand-900">{i.product_name ?? "—"}</p>
                    <p className="text-sm text-ink/70">
                      {[
                        i.size_label && `${t.size}: ${i.size_label}`,
                        (i.colour_name || i.colour_code) && `${t.colour}: ${[i.colour_name, i.colour_code].filter(Boolean).join(" ")}`,
                        i.colour_note && `${t.colour}: ${i.colour_note}`,
                        `× ${i.quantity}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold text-brand-700">{formatPrice(i.unit_price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-brand-100 pt-3">
              <Row label={t.subtotal}>{formatPrice(order.subtotal)}</Row>
              <Row label={t.delivery}>{formatPrice(order.delivery_fee)}</Row>
            </dl>
          </Card>
        </div>

        <div className="space-y-5">
          <section className="space-y-1 rounded-2xl bg-brand-900 p-5 text-white">
            <p className="text-sm text-white/80">{t.collect}</p>
            <p data-testid="amount-to-collect" className="text-4xl font-extrabold text-sun-300">
              {formatPrice(order.total)}
            </p>
          </section>

          <Card title={t.changeStatus}>
            <OrderActions status={order.status} setStatus={setStatus} deleteOrder={deleteOrder} />
          </Card>

          <Card title={t.messages}>
            <div className="flex flex-col gap-2">
              <a href={customerWhatsAppUrl(order, "confirm")} target="_blank" rel="noopener noreferrer" className={`${button} bg-[#25D366] text-white hover:opacity-90`}>
                {t.confirmWhatsApp}
              </a>
              <a href={customerWhatsAppUrl(order, "update")} target="_blank" rel="noopener noreferrer" className={`${button} border-2 border-[#25D366] text-ink hover:bg-[#25D366]/10`}>
                {t.updateWhatsApp}
              </a>
              <a href={deliveryWhatsAppUrl(order)} target="_blank" rel="noopener noreferrer" className={`${button} bg-brand-700 text-white hover:bg-brand-900`}>
                {t.deliveryWhatsApp}
              </a>
              <CopyButton text={deliveryMessage(order)} label={t.copyDelivery} />
              <Link href={printHref} className={`${button} border-2 border-brand-100 text-brand-900 hover:bg-brand-50`}>
                {t.print}
              </Link>
            </div>
          </Card>

          <Card title={t.deliveryInfo}>
            <NotesForm
              initial={{ delivery_company: order.delivery_company, tracking_note: order.tracking_note, internal_note: order.internal_note }}
              action={saveNotes}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}
