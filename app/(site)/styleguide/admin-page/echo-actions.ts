"use server";

import { notFound } from "next/navigation";
import type { ActionState } from "@/lib/admin/types";
import { isPageSlug, validatePage } from "@/lib/pages";

// Dev-only stand-in for the real action: the real checks, nothing saved. Remove with the styleguide before launch.
export async function echoSavePage(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (process.env.NODE_ENV === "production") notFound();
  if (!isPageSlug(slug)) return { error: "bad slug" };
  const r = validatePage(slug, Object.fromEntries(formData));
  return r.ok ? { error: `ECHO:${JSON.stringify(r.value)}` } : { errors: r.errors };
}
