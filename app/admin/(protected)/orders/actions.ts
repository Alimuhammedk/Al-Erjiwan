"use server";

import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { DEFAULT_TEMPLATES, MAX_TEMPLATE_LENGTH, MESSAGE_KINDS, STATUS_ORDER, TEMPLATE_SETTING, type MessageKind } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const t = ar.admin.orders;
const failed: ActionState = { error: ar.admin.errors.saveFailed };

// Changes an order's status to any other. The database moves stock to match (and refuses a reopen if an item sold out).
export async function setOrderStatusAction(id: string, status: string): Promise<ActionState> {
  await requireAdmin();
  if (!UUID.test(id) || !(STATUS_ORDER as readonly string[]).includes(status)) return { error: t.statusError };
  const db = await createAuthClient();
  const { error } = await db.rpc("set_order_status", { p_order: id, p_status: status });
  if (!error) return {};
  const sold = /OUT_OF_STOCK:(.+)/.exec(error.message);
  if (sold) return { error: t.reopenSoldOut.replace("{name}", sold[1].trim()) };
  return error.message.includes("INVALID_TRANSITION") ? { error: t.statusError } : failed;
}

// Deletes any order. The database gives stock back when the order was still active and never when it was delivered.
export async function deleteOrderAction(id: string): Promise<ActionState> {
  await requireAdmin();
  if (!UUID.test(id)) return { error: t.notFound };
  const db = await createAuthClient();
  const { error } = await db.rpc("delete_order", { p_order: id });
  if (!error) return {};
  return error.message.includes("NOT_FOUND") ? { error: t.notFound } : failed;
}

// Saves the owner's wording of a customer message as the preset for every future order. Saving the built-in text
// (or nothing) removes the preset so the built-in one is used again.
export async function saveMessageTemplateAction(kind: string, template: string): Promise<ActionState> {
  await requireAdmin();
  if (!(MESSAGE_KINDS as readonly string[]).includes(kind)) return failed;
  const key = TEMPLATE_SETTING[kind as MessageKind];
  const text = template.replace(/\r\n/g, "\n").trim();
  if (text.length > MAX_TEMPLATE_LENGTH) return { error: ar.admin.errors.tooLong };

  const db = await createAuthClient();
  const { error } =
    text === "" || text === DEFAULT_TEMPLATES[kind as MessageKind]
      ? await db.from("settings").delete().eq("key", key)
      : await db.from("settings").upsert({ key, value: text }, { onConflict: "key" });
  return error ? failed : {};
}
