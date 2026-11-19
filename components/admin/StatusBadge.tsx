import { ar } from "@/content/ar";

const labels = ar.admin.orders.statuses as Record<string, string>;
const colours: Record<string, string> = {
  new: "bg-coral-500 text-white",
  confirmed: "bg-brand-700 text-white",
  shipped: "bg-orange-400 text-ink",
  delivered: "bg-emerald-600 text-white",
  cancelled: "bg-ink/70 text-white",
  returned: "bg-ink/70 text-white",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${colours[status] ?? "bg-brand-100 text-brand-900"}`}>
      {labels[status] ?? status}
    </span>
  );
}
