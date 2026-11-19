import { ar } from "@/content/ar";
import type { Result } from "./types";
import { STORE_MAX, type StoreSettings } from "@/lib/store-settings";

type Raw = Record<string, FormDataEntryValue | null | undefined>;

// The three texts typed in the admin. Empty is allowed (it means "use the built-in text"); too long is refused.
export function validateStoreInfo(raw: Raw): Result<StoreSettings> {
  const errors: Record<string, string> = {};
  const value = {} as StoreSettings;
  for (const field of Object.keys(STORE_MAX) as (keyof StoreSettings)[]) {
    const v = typeof raw[field] === "string" ? (raw[field] as string).replace(/\r\n/g, "\n").trim() : "";
    if (v.length > STORE_MAX[field]) errors[field] = ar.admin.errors.tooLong;
    value[field] = v;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}
