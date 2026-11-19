import { createServerClient } from "@/lib/supabase/server";

export type DeliveryZone = { id: string; governorate_ar: string; fee: number; min_order: number };
export type OrderLine = { name: string; size: string | null; quantity: number };
export type OrderSummary = { status: string; created_at: string; total: number; items: OrderLine[] };
export type TrackedOrder = OrderSummary & { updated_at: string; delivery_company: string | null };

// Active governorates with their delivery fee and minimum order, for the checkout.
export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  try {
    const db = createServerClient();
    if (!db) return [];
    const { data, error } = await db
      .from("delivery_zones")
      .select("id, governorate_ar, fee, min_order")
      .eq("is_active", true)
      .order("governorate_ar");
    if (error) return [];
    return ((data as DeliveryZone[] | null) ?? []).map((z) => ({ ...z, fee: Number(z.fee), min_order: Number(z.min_order) }));
  } catch {
    return [];
  }
}

// Order codes are 8 letters and digits. Anything else cannot be real, so it never reaches the database.
const cleanCode = (code: string) => {
  const c = code.trim().toUpperCase();
  return /^[A-Z0-9]{8}$/.test(c) ? c : null;
};

export async function getOrderSummary(code: string): Promise<OrderSummary | null> {
  const c = cleanCode(code);
  if (!c) return null;
  try {
    const db = createServerClient();
    if (!db) return null;
    const { data, error } = await db.rpc("order_summary", { p_code: c });
    return error || !data ? null : (data as OrderSummary);
  } catch {
    return null;
  }
}

export async function trackOrder(code: string, phone: string): Promise<TrackedOrder | null> {
  const c = cleanCode(code);
  const p = phone.trim();
  if (!c || p.length < 7 || p.length > 25) return null;
  try {
    const db = createServerClient();
    if (!db) return null;
    const { data, error } = await db.rpc("track_order", { p_code: c, p_phone: p });
    return error || !data ? null : (data as TrackedOrder);
  } catch {
    return null;
  }
}
