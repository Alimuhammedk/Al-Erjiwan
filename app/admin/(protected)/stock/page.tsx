import { StockTable } from "@/components/admin/StockTable";
import { ThresholdForm } from "@/components/admin/ThresholdForm";
import { ar } from "@/content/ar";
import { formatDateTime } from "@/lib/format";
import { getLowStockThreshold, getRecentMovements, getStockRows } from "@/lib/admin/stock-data";
import { adjustStockAction, saveThresholdAction } from "./actions";

export const dynamic = "force-dynamic";
const t = ar.admin.stock;

export default async function StockPage() {
  const [rows, threshold, movements] = await Promise.all([getStockRows(), getLowStockThreshold(), getRecentMovements()]);
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">{t.title}</h1>
      <ThresholdForm value={threshold} action={saveThresholdAction} />
      <StockTable rows={rows} threshold={threshold} adjust={adjustStockAction} />

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold text-brand-900">{t.history}</h2>
        {movements.length === 0 ? (
          <p className="rounded-2xl bg-paper p-6 text-center text-brand-700">{t.noHistory}</p>
        ) : (
          <ul className="divide-y divide-brand-100 rounded-2xl bg-paper">
            {movements.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 text-sm">
                <span className="min-w-0 flex-1 break-words font-bold text-brand-900">
                  {m.product_name ?? "—"}
                  {m.size_label && <span className="font-normal text-ink/70"> · {m.size_label}</span>}
                </span>
                <span dir="ltr" className={`font-extrabold ${m.delta < 0 ? "text-coral-500" : "text-emerald-600"}`}>
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </span>
                <span>{(t.reasons as Record<string, string>)[m.reason] ?? m.reason}</span>
                <span className="text-ink/70">{formatDateTime(m.created_at)}</span>
                {m.by_email && (
                  <span dir="ltr" className="text-ink/60">
                    {m.by_email}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
