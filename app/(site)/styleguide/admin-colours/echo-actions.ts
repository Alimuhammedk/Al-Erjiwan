"use server";

import { notFound } from "next/navigation";
import { ar } from "@/content/ar";
import type { ImportState } from "@/app/admin/(protected)/colours/actions";
import type { ActionState } from "@/lib/admin/types";
import { parseColourCsv } from "@/lib/colours/csv";
import { validateColour } from "@/lib/colours/form";

// Dev-only stand-ins for the colour actions: real checks, nothing is saved. Remove with the styleguide before launch.
const dev = () => {
  if (process.env.NODE_ENV === "production") notFound();
};
const t = ar.admin.colours;

export async function echoSaveColour(_prev: ActionState, formData: FormData): Promise<ActionState> {
  dev();
  const r = validateColour(Object.fromEntries(formData));
  return r.ok ? { error: `ECHO:colour:${r.value.hex}:${r.value.code ?? ""}` } : { errors: r.errors };
}

async function parse(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  return parseColourCsv(await file.text());
}

export async function echoPreview(_prev: ImportState, formData: FormData): Promise<ImportState> {
  dev();
  const p = await parse(formData);
  if (!p) return { error: t.noFile };
  return {
    info: t.previewResult.replace("{ok}", String(p.rows.length)).replace("{bad}", String(p.errors.length)),
    issues: [...p.errors, ...p.warnings].map((e) => t.lineError.replace("{line}", String(e.line)).replace("{message}", e.message)),
  };
}

export async function echoImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  dev();
  const p = await parse(formData);
  if (!p) return { error: t.noFile };
  if (p.rows.length === 0) return { error: t.noValidRows };
  return { info: `ECHO:import:${p.rows.length}` };
}
