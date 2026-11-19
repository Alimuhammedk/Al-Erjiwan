import { ar } from "@/content/ar";
import type { Result } from "@/lib/admin/types";
import { normaliseHex } from "./hex";

type Raw = Record<string, FormDataEntryValue | null | undefined>;
const str = (v: Raw[string]) => (typeof v === "string" ? v.trim() : "");
const e = ar.admin.errors;
const c = ar.admin.colours;

export type ColourInput = {
  name_ar: string;
  name_en: string | null;
  system: string | null;
  code: string | null;
  hex: string;
  family: string | null;
};

// One colour typed by hand in the admin. The hex comes from the typed box (or the colour box if that is empty).
export function validateColour(raw: Raw): Result<ColourInput> {
  const errors: Record<string, string> = {};

  const name_ar = str(raw.name_ar);
  if (name_ar.length < 2) errors.name_ar = e.required;
  else if (name_ar.length > 100) errors.name_ar = e.tooLong;

  const hex = normaliseHex(str(raw.hex_text) || str(raw.hex));
  if (!hex) errors.hex = c.invalidHex;

  const optional = (key: "name_en" | "system" | "code" | "family", max: number) => {
    const v = str(raw[key]);
    if (v.length > max) errors[key] = e.tooLong;
    return v || null;
  };
  const name_en = optional("name_en", 100);
  const system = optional("system", 50);
  const code = optional("code", 40);
  const family = optional("family", 40);

  if (Object.keys(errors).length || !hex) return { ok: false, errors };
  return { ok: true, value: { name_ar, name_en, system, code, hex, family } };
}
