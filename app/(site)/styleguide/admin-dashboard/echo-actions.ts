"use server";

import { notFound } from "next/navigation";
import { planStockChange } from "@/lib/admin/stock";
import type { ActionState } from "@/lib/admin/types";

// Dev-only stand-in for the stock action: runs the real checks against a fixed current number (3), changes
// nothing, and reports what would have been sent. Remove together with the styleguide before launch.
export async function echoAdjust(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (process.env.NODE_ENV === "production") notFound();
  const plan = planStockChange(String(formData.get("mode")), String(formData.get("amount")), 3);
  return plan.ok ? { error: `ECHO:${plan.delta}:${plan.reason}` } : { errors: { amount: plan.error } };
}
