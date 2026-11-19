"use server";

import { redirect } from "next/navigation";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { STATUS_ORDER } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const t = ar.admin.orders;
const failed: ActionState = { error: ar.admin.errors.saveFailed };

// Changes an order's status. The database checks the move is allowed and gives stock back once on cancel or return.
export async function setOrderStatusAction(id: string, status: string): Promise<ActionState> {
  await requireAdmin();
  if (!UUID.test(id) || !(STATUS_ORDER as readonly string[]).includes(status)) return { error: t.statusError };
  const db = await createAuthClient();
  const { error } = await db.rpc("set_order_status", { p_order: id, p_status: status });
  if (error) return error.message.includes("INVALID_TRANSITION") ? { error: t.statusError } : failed;
  return {};
}

export async function saveOrderNotesAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!UUID.test(id)) return failed;

  const errors: Record<string, string> = {};
  const field = (key: string, max: number) => {
    const v = String(formData.get(key) ?? "").trim();
    if (v.length > max) errors[key] = ar.admin.errors.tooLong;
    return v || null;
  };
  const values = {
    delivery_company: field("delivery_company", 100),
    tracking_note: field("tracking_note", 200),
    internal_note: field("internal_note", 1000),
  };
  if (Object.keys(errors).length) return { errors };

  const db = await createAuthClient();
  const { error } = await db.from("orders").update(values).eq("id", id);
  return error ? failed : {};
}

// Only a cancelled order can be deleted (for example a test order). Real history is kept.
export async function deleteOrderAction(id: string): Promise<ActionState> {
  await requireAdmin();
  if (!UUID.test(id)) return { error: t.notFound };
  const db = await createAuthClient();
  const { data } = await db.from("orders").select("status").eq("id", id).maybeSingle();
  if (!data) return { error: t.notFound };
  if (data.status !== "cancelled") return { error: t.statusError };
  const { error } = await db.from("orders").delete().eq("id", id);
  if (error) return failed;
  redirect("/admin/orders");
}
