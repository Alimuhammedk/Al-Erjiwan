import { ar } from "@/content/ar";
import { storeInfo } from "@/lib/store-info";

// The shop texts the owner edits in the admin, stored in the settings table (empty means "use the built-in text").
export const STORE_KEYS = { guarantee: "store_guarantee", hours: "store_hours", address: "store_address" } as const;
export const STORE_MAX = { guarantee: 600, hours: 200, address: 200 } as const;

export type StoreSettings = { guarantee: string; hours: string; address: string };

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  guarantee: ar.home.shopInfo.defaultGuarantee,
  hours: "",
  address: storeInfo.address,
};

// Turns the settings rows into the texts to show; a missing or blank row falls back to the built-in text.
export function parseStoreSettings(rows: { key: string; value: string }[] | null | undefined): StoreSettings {
  const out = { ...DEFAULT_STORE_SETTINGS };
  for (const field of Object.keys(STORE_KEYS) as (keyof typeof STORE_KEYS)[]) {
    const row = rows?.find((r) => r.key === STORE_KEYS[field]);
    const value = typeof row?.value === "string" ? row.value.trim() : "";
    if (value) out[field] = value.slice(0, STORE_MAX[field]);
  }
  return out;
}
