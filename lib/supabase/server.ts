import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public (anon key) client for reading storefront data. Returns null when keys are missing
// so pages still render. shortcut: no cookie session yet, add @supabase/ssr in phase 2 for admin login.
export function createServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
