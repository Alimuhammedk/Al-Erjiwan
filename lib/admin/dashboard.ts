import { STATUS_ORDER } from "./orders";

export type DashboardStats = {
  byStatus: Record<string, number>;
  newOrders: number;
  ordersToday: number;
  salesToday: number;
  salesMonth: number;
  stock: { available: number; low: number; out: number };
  lowStock: { name: string; size: string | null; stock: number }[];
  bestSellers: { name: string; quantity: number }[];
};

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

// Turns the database's answer into numbers and lists the page can use. A status the database did not mention counts as 0.
export function parseDashboardStats(json: unknown): DashboardStats | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const j = json as Record<string, unknown>;
  const by = obj(j.by_status);
  const stock = obj(j.stock_summary);
  return {
    byStatus: Object.fromEntries(STATUS_ORDER.map((s) => [s, num(by[s])])),
    newOrders: num(j.new_orders),
    ordersToday: num(j.orders_today),
    salesToday: num(j.sales_today),
    salesMonth: num(j.sales_month),
    stock: { available: num(stock.available), low: num(stock.low), out: num(stock.out) },
    lowStock: arr(j.low_stock).map((r) => {
      const o = obj(r);
      return { name: String(o.name ?? "—"), size: o.size == null ? null : String(o.size), stock: num(o.stock) };
    }),
    bestSellers: arr(j.best_sellers).map((r) => {
      const o = obj(r);
      return { name: String(o.name ?? "—"), quantity: num(o.quantity) };
    }),
  };
}
