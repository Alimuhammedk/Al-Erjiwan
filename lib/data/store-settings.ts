import { DEFAULT_STORE_SETTINGS, STORE_KEYS, parseStoreSettings, type StoreSettings } from "@/lib/store-settings";
import { createServerClient } from "@/lib/supabase/server";

// The shop texts for the public pages. Any failure gives the built-in texts, never an error page.
export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const db = createServerClient();
    if (!db) return DEFAULT_STORE_SETTINGS;
    const { data, error } = await db.from("settings").select("key, value").in("key", Object.values(STORE_KEYS));
    return error ? DEFAULT_STORE_SETTINGS : parseStoreSettings(data as { key: string; value: string }[] | null);
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}
