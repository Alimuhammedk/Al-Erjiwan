import { notFound } from "next/navigation";
import { DashboardView } from "@/components/admin/DashboardView";
import { StockTable } from "@/components/admin/StockTable";
import type { DashboardStats } from "@/lib/admin/dashboard";
import type { OrderRow } from "@/lib/admin/orders-data";
import type { StockRow } from "@/lib/admin/stock-data";
import { echoAdjust } from "./echo-actions";

// Dev-only copy of the dashboard (?state=full | empty | error) and of the stock list (?view=stock) with sample data.
// Remove before launch.
const full: DashboardStats = {
  byStatus: { new: 3, confirmed: 2, shipped: 1, delivered: 14, cancelled: 2, returned: 1 },
  newOrders: 3,
  ordersToday: 4,
  salesToday: 345000,
  salesMonth: 4120000,
  stock: { available: 18, low: 3, out: 2 },
  lowStock: [
    { name: "فرشاة طلاء احترافية", size: null, stock: 0 },
    { name: "بنتلايت داخلي ممتاز", size: "1 لتر", stock: 0 },
    { name: "دهان مخلوط", size: "4 لتر", stock: 2 },
  ],
  bestSellers: [
    { name: "بنتلايت داخلي ممتاز", quantity: 24 },
    { name: "دهان مخلوط", quantity: 11 },
  ],
};
const empty: DashboardStats = {
  byStatus: { new: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0 },
  newOrders: 0,
  ordersToday: 0,
  salesToday: 0,
  salesMonth: 0,
  stock: { available: 0, low: 0, out: 0 },
  lowStock: [],
  bestSellers: [],
};
const latest: OrderRow[] = [
  { id: "1", code: "ABCD1234", customer_name: "علي حسين", phone: "07701234567", governorate: "بابل", total: 123000, status: "new", created_at: "2026-11-20T10:00:00Z" },
  { id: "2", code: "WXYZ9876", customer_name: "سارة أحمد", phone: "07801234567", governorate: "بغداد", total: 58000, status: "shipped", created_at: "2026-11-19T09:00:00Z" },
];
const rows: StockRow[] = [
  { key: "a", productId: "123e4567-e89b-12d3-a456-426614174001", variantId: null, name: "فرشاة طلاء احترافية", size: null, stock: 0, active: true },
  { key: "b", productId: "123e4567-e89b-12d3-a456-426614174002", variantId: "223e4567-e89b-12d3-a456-426614174001", name: "بنتلايت داخلي ممتاز", size: "4 لتر", stock: 3, active: true },
  { key: "c", productId: "123e4567-e89b-12d3-a456-426614174003", variantId: null, name: "رولة طلاء", size: null, stock: 40, active: false },
];

export default async function AdminDashboardHarness({ searchParams }: { searchParams: Promise<{ state?: string; view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { state = "full", view } = await searchParams;
  if (view === "stock") {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        <StockTable rows={rows} threshold={5} adjust={echoAdjust} />
      </main>
    );
  }
  return <DashboardView stats={state === "error" ? null : state === "empty" ? empty : full} latest={state === "full" ? latest : []} />;
}
