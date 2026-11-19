import { createAuthClient } from "@/lib/supabase/auth-server";
import { ORDERS_PER_PAGE, type AdminOrder, type OrderListQuery } from "./orders";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Orders waiting for the owner. Feeds the badge in the admin menu; 0 if anything goes wrong.
export async function getNewOrderCount(): Promise<number> {
  try {
    const db = await createAuthClient();
    const { count, error } = await db.from("orders").select("id", { count: "exact", head: true }).eq("status", "new");
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
}

// Earlier orders of the same phone that ended cancelled or returned: a hint to confirm by phone first.
export async function getProblemOrderCount(phone: string, excludeId: string): Promise<number> {
  try {
    const db = await createAuthClient();
    const { count, error } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .neq("id", excludeId)
      .in("status", ["cancelled", "returned"]);
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
}

type Row = Omit<AdminOrder, "items" | "subtotal" | "delivery_fee" | "total"> & {
  subtotal: number | string;
  delivery_fee: number | string;
  total: number | string;
  order_items: (Omit<AdminOrder["items"][number], "unit_price"> & { unit_price: number | string })[] | null;
};

export async function getOrder(id: string): Promise<AdminOrder | null> {
  if (!UUID.test(id)) return null;
  try {
    const db = await createAuthClient();
    const { data, error } = await db
      .from("orders")
      .select("*, order_items(product_name, size_label, colour_name, colour_code, colour_note, quantity, unit_price)")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const { order_items, ...o } = data as Row;
    return {
      ...o,
      subtotal: Number(o.subtotal),
      delivery_fee: Number(o.delivery_fee),
      total: Number(o.total),
      items: (order_items ?? []).map((i) => ({ ...i, unit_price: Number(i.unit_price) })),
    };
  } catch {
    return null;
  }
}

export type OrderRow = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  governorate: string;
  total: number;
  status: string;
  created_at: string;
};

// One page of the orders list, newest first, with the chosen status and search.
export async function listOrders(q: OrderListQuery): Promise<{ orders: OrderRow[]; total: number }> {
  try {
    const db = await createAuthClient();
    let query = db
      .from("orders")
      .select("id, code, customer_name, phone, governorate, total, status, created_at", { count: "exact" });
    if (q.status) query = query.eq("status", q.status);
    if (q.q) query = query.or(`code.ilike.%${q.q}%,customer_name.ilike.%${q.q}%,phone.ilike.%${q.q}%`);
    const from = (q.page - 1) * ORDERS_PER_PAGE;
    const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + ORDERS_PER_PAGE - 1);
    if (error) return { orders: [], total: 0 };
    const rows = (data as (Omit<OrderRow, "total"> & { total: number | string })[] | null) ?? [];
    return { orders: rows.map((r) => ({ ...r, total: Number(r.total) })), total: count ?? 0 };
  } catch {
    return { orders: [], total: 0 };
  }
}
