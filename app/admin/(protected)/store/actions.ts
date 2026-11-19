"use server";

import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { validateStoreInfo } from "@/lib/admin/store-info";
import { requireAdmin } from "@/lib/auth";
import { STORE_KEYS } from "@/lib/store-settings";
import { createAuthClient } from "@/lib/supabase/auth-server";

// Saves the guarantee, opening hours and address shown on the homepage. A blank text removes its row, so the
// built-in text (or nothing, for the hours) is used again.
export async function saveStoreInfoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = validateStoreInfo(Object.fromEntries(formData));
  if (!result.ok) return { errors: result.errors };

  const db = await createAuthClient();
  for (const field of Object.keys(STORE_KEYS) as (keyof typeof STORE_KEYS)[]) {
    const value = result.value[field];
    const { error } = value
      ? await db.from("settings").upsert({ key: STORE_KEYS[field], value }, { onConflict: "key" })
      : await db.from("settings").delete().eq("key", STORE_KEYS[field]);
    if (error) return { error: ar.admin.errors.saveFailed };
  }
  return {};
}
