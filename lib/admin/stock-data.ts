import { createAuthClient } from "@/lib/supabase/auth-server";

export type StockRow = { key: string; productId: string; variantId: string | null; name: string; size: string | null; stock: number; active: boolean };
export type Movement = { id: string; created_at: string; product_name: string | null; size_label: string | null; delta: number; reason: string; by_email: string | null };

type RawProduct = { id: string; name_ar: string; stock: number; is_active: boolean; product_variants: { id: string; size_label: string; stock: number }[] | null };

// Every product, or every size of a product that has sizes, with its quantity, lowest first.
export async function getStockRows(): Promise<StockRow[]> {
  try {
    const db = await createAuthClient();
    const { data, error } = await db.from("products").select("id, name_ar, stock, is_active, product_variants(id, size_label, stock)");
    if (error || !data) return [];
    const rows = (data as unknown as RawProduct[]).flatMap((p): StockRow[] =>
      p.product_variants?.length
        ? p.product_variants.map((v) => ({ key: v.id, productId: p.id, variantId: v.id, name: p.name_ar, size: v.size_label, stock: Number(v.stock), active: p.is_active }))
        : [{ key: p.id, productId: p.id, variantId: null, name: p.name_ar, size: null, stock: Number(p.stock), active: p.is_active }],
    );
    return rows.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, "ar"));
  } catch {
    return [];
  }
}

export async function getLowStockThreshold(): Promise<number> {
  try {
    const db = await createAuthClient();
    const { data } = await db.from("settings").select("value").eq("key", "low_stock_threshold").maybeSingle();
    const n = Number((data as { value: string } | null)?.value);
    return Number.isInteger(n) && n >= 0 ? n : 5;
  } catch {
    return 5;
  }
}

export async function getRecentMovements(limit = 20): Promise<Movement[]> {
  try {
    const db = await createAuthClient();
    const { data, error } = await db
      .from("stock_movements")
      .select("id, created_at, product_name, size_label, delta, reason, by_email")
      .order("created_at", { ascending: false })
      .limit(limit);
    return error || !data ? [] : (data as Movement[]);
  } catch {
    return [];
  }
}
