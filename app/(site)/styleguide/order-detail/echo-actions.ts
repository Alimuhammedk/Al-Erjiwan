"use server";

import { notFound } from "next/navigation";
import type { ActionState } from "@/lib/admin/types";

// Dev-only stand-ins for the real order actions: they change nothing and just report what was asked.
// Remove together with the styleguide before launch.
function dev() {
  if (process.env.NODE_ENV === "production") notFound();
}

export async function echoSetStatus(status: string): Promise<ActionState> {
  dev();
  return { error: `ECHO:status:${status}` };
}

export async function echoSaveNotes(_prev: ActionState, formData: FormData): Promise<ActionState> {
  dev();
  if (String(formData.get("delivery_notes") ?? "").includes("FAIL")) return { errors: { delivery_notes: "خطأ تجريبي" } };
  return {};
}

export async function echoDelete(): Promise<ActionState> {
  dev();
  return { error: "ECHO:delete" };
}

export async function echoAssign(companyId: string | null): Promise<ActionState> {
  dev();
  return companyId === "c3" ? { error: "ECHO:assign:c3" } : {};
}

export async function echoSaveTemplate(kind: string, template: string): Promise<ActionState> {
  dev();
  return template.includes("FAIL") ? { error: "ECHO:template-failed" } : {};
}
