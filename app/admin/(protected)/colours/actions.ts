"use server";

import { refreshCatalog } from "@/lib/cache";
import { redirect } from "next/navigation";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { parseColourCsv } from "@/lib/colours/csv";
import { validateColour } from "@/lib/colours/form";
import { requireAdmin } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/auth-server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const t = ar.admin.colours;
const failed: ActionState = { error: ar.admin.errors.saveFailed };
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const BATCH = 500;

export async function saveColourAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  if (id !== null && !UUID.test(id)) return failed;
  const result = validateColour(Object.fromEntries(formData));
  if (!result.ok) return { errors: result.errors };

  const db = await createAuthClient();
  const { error } = await (id ? db.from("colours").update(result.value).eq("id", id) : db.from("colours").insert(result.value));
  if (error) return error.message.includes("colours_system_code_key") ? { errors: { code: t.codeTaken } } : failed;
  refreshCatalog();
  redirect("/admin/colours");
}

// Ready-made sizes that use the colour keep existing without it; old orders keep the colour's name and code.
export async function deleteColourAction(id: string): Promise<void> {
  await requireAdmin();
  if (!UUID.test(id)) throw new Error(ar.admin.errors.saveFailed);
  const db = await createAuthClient();
  const { error } = await db.from("colours").delete().eq("id", id);
  if (error) throw new Error(ar.admin.errors.saveFailed);
  refreshCatalog();
  redirect("/admin/colours");
}

// What the import page shows: a message, and the first lines with problems.
export type ImportState = ActionState & { info?: string; issues?: string[] };

async function readFile(formData: FormData): Promise<{ text: string } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: t.noFile };
  if (file.size > MAX_FILE_BYTES) return { error: t.fileTooBig };
  return { text: await file.text() };
}

function issueLines(errors: { line: number; message: string }[]): string[] {
  const lines = errors.slice(0, 20).map((e) => t.lineError.replace("{line}", String(e.line)).replace("{message}", e.message));
  return errors.length > 20 ? [...lines, t.moreErrors] : lines;
}

// Checks the file and says what would happen. Writes nothing.
export async function previewColourImportAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = await readFile(formData);
  if ("error" in file) return { error: file.error };
  const parsed = parseColourCsv(file.text);
  return {
    info: t.previewResult.replace("{ok}", String(parsed.rows.length)).replace("{bad}", String(parsed.errors.length)),
    issues: issueLines([...parsed.errors, ...parsed.warnings]),
  };
}

// Imports the good rows in batches (each batch all-or-nothing in the database) and reports what was added and updated.
export async function importColoursAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = await readFile(formData);
  if ("error" in file) return { error: file.error };
  const parsed = parseColourCsv(file.text);
  if (parsed.rows.length === 0) return { error: t.noValidRows, issues: issueLines(parsed.errors) };

  const db = await createAuthClient();
  let added = 0;
  let updated = 0;
  for (let i = 0; i < parsed.rows.length; i += BATCH) {
    const { data, error } = await db.rpc("import_colours", { p_rows: parsed.rows.slice(i, i + BATCH) });
    if (error) return { error: t.importPartial.replace("{saved}", String(added + updated)), issues: issueLines(parsed.errors) };
    const r = data as { added: number; updated: number };
    added += Number(r.added);
    updated += Number(r.updated);
  }
  return {
    info: t.importResult.replace("{added}", String(added)).replace("{updated}", String(updated)),
    issues: issueLines([...parsed.errors, ...parsed.warnings]),
  };
}
