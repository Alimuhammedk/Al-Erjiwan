"use server";

import { notFound } from "next/navigation";
import { validateCompany, validateFees } from "@/lib/admin/delivery";
import type { ActionState } from "@/lib/admin/types";

// Dev-only stand-ins for the real delivery actions: they run the real checks, change nothing, and report what
// would have been saved. Remove together with the styleguide before launch.
function dev() {
  if (process.env.NODE_ENV === "production") notFound();
}

export async function echoSaveFees(_prev: ActionState, formData: FormData): Promise<ActionState> {
  dev();
  const r = validateFees(Object.fromEntries(formData));
  return r.ok ? { error: `ECHO:fees:${JSON.stringify(r.value.map((z) => [z.fee, z.min_order, z.is_active]))}` } : { errors: r.errors };
}

export async function echoSaveCompany(_prev: ActionState, formData: FormData): Promise<ActionState> {
  dev();
  const r = validateCompany(Object.fromEntries(formData));
  return r.ok ? { error: `ECHO:company:${r.value.whatsapp}:${JSON.stringify(r.value.prices.map((p) => p.price))}` } : { errors: r.errors };
}
