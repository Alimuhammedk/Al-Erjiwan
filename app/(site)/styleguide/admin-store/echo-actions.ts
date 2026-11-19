"use server";

import { notFound } from "next/navigation";
import { validateStoreInfo } from "@/lib/admin/store-info";
import type { ActionState } from "@/lib/admin/types";

// Dev-only stand-in for the real action: the real checks, nothing saved. Remove with the styleguide before launch.
export async function echoSaveStore(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (process.env.NODE_ENV === "production") notFound();
  const r = validateStoreInfo(Object.fromEntries(formData));
  return r.ok ? { error: `ECHO:${JSON.stringify(r.value)}` } : { errors: r.errors };
}
