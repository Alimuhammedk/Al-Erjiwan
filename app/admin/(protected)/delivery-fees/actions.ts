"use server";

import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { validateFees } from "@/lib/admin/delivery";
import { requireAdmin } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-server";

// Saves the fee, minimum order and on/off of every governorate at once. New orders use the new fees straight away;
// old orders keep the fee they were placed with.
export async function saveZonesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = validateFees(Object.fromEntries(formData));
  if (!result.ok) return { errors: result.errors };

  const db = await createAuthClient();
  const results = await Promise.all(
    result.value.map(({ id, ...values }) => db.from("delivery_zones").update(values).eq("id", id)),
  );
  return results.some((r) => r.error) ? { error: ar.admin.errors.saveFailed } : {};
}
