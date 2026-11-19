"use server";

import { redirect } from "next/navigation";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { validateCompany } from "@/lib/admin/delivery";
import { requireAdmin } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const failed: ActionState = { error: ar.admin.errors.saveFailed };

// Saves a company and its price list in one go. Prices are written first and the ones no longer wanted are removed
// after, so a failure part-way leaves the old list in place rather than an empty one.
export async function saveCompanyAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  if (id !== null && !UUID.test(id)) return failed;
  const result = validateCompany(Object.fromEntries(formData));
  if (!result.ok) return { errors: result.errors };
  const { prices, ...company } = result.value;

  const db = await createAuthClient();
  let companyId = id;
  if (id) {
    const { error } = await db.from("delivery_companies").update(company).eq("id", id);
    if (error) return failed;
  } else {
    const { data, error } = await db.from("delivery_companies").insert(company).select("id").single();
    if (error || !data) return failed;
    companyId = (data as { id: string }).id;
  }

  if (prices.length) {
    const { error } = await db
      .from("delivery_company_prices")
      .upsert(prices.map((p) => ({ company_id: companyId, ...p })), { onConflict: "company_id,zone_id" });
    if (error) return failed;
  }
  const stale = db.from("delivery_company_prices").delete().eq("company_id", companyId);
  const { error } = await (prices.length ? stale.not("zone_id", "in", `(${prices.map((p) => p.zone_id).join(",")})`) : stale);
  if (error) return failed;

  redirect("/admin/delivery-companies");
}

// Old orders keep the company's name and cost (the database clears only the link).
export async function deleteCompanyAction(id: string): Promise<void> {
  await requireAdmin();
  if (!UUID.test(id)) throw new Error(ar.admin.errors.saveFailed);
  const db = await createAuthClient();
  const { error } = await db.from("delivery_companies").delete().eq("id", id);
  if (error) throw new Error(ar.admin.errors.saveFailed);
  redirect("/admin/delivery-companies");
}
