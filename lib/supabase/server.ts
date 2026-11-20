import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CATALOG_SECONDS, CATALOG_TAG } from "@/lib/cache";

// Public (anon key) client for reading storefront data. Returns null when keys are missing
// so pages still render. { cached: true } is for shared catalog reads only, never for orders or stock checks.
export function createServerClient(opts: { cached?: boolean } = {}): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    ...(opts.cached && {
      global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: CATALOG_SECONDS, tags: [CATALOG_TAG] } }) },
    }),
  });
}
