"use server";

import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { parseAmount, planStockChange } from "@/lib/admin/stock";
import { requireAdmin } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const t = ar.admin.stock;
const failed: ActionState = { error: ar.admin.errors.saveFailed };

// One stock button: add a delivery, record a shop sale, or set the number. The database does the change and the
// history entry in one step and refuses to go below zero.
export async function adjustStockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const product = String(formData.get("product_id") ?? "");
  const variant = String(formData.get("variant_id") ?? "") || null;
  if (!UUID.test(product) || (variant !== null && !UUID.test(variant))) return failed;

  const db = await createAuthClient();
  const mode = String(formData.get("mode") ?? "");
  const amount = String(formData.get("amount") ?? "");

  let current = 0;
  if (mode === "set") {
    const { data } = await (variant
      ? db.from("product_variants").select("stock").eq("id", variant).maybeSingle()
      : db.from("products").select("stock").eq("id", product).maybeSingle());
    if (!data) return failed;
    current = Number((data as { stock: number }).stock);
  }

  const plan = planStockChange(mode, amount, current);
  if (!plan.ok) return { errors: { amount: plan.error } };

  const { error } = await db.rpc("adjust_stock", {
    p_product: product,
    p_variant: variant,
    p_delta: plan.delta,
    p_reason: plan.reason,
    p_note: plan.note,
  });
  if (!error) return {};
  return error.message.includes("NEGATIVE_STOCK") ? { errors: { amount: t.notEnough } } : failed;
}

// The number at or below which a product shows as "low" on the dashboard and the stock page.
export async function saveThresholdAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const n = parseAmount(String(formData.get("threshold") ?? ""));
  if (n === null || n > 9999) return { errors: { threshold: t.invalidAmount } };
  const db = await createAuthClient();
  const { error } = await db.from("settings").upsert({ key: "low_stock_threshold", value: String(n) }, { onConflict: "key" });
  return error ? failed : {};
}
