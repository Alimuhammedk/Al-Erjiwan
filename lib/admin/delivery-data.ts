import { createAuthClient } from "@/lib/supabase/auth-server";

export type AdminZone = { id: string; governorate_ar: string; fee: number; min_order: number; is_active: boolean };

// Every governorate (also the switched-off ones) for the fees tab.
export async function getAdminZones(): Promise<AdminZone[]> {
  try {
    const db = await createAuthClient();
    const { data, error } = await db.from("delivery_zones").select("id, governorate_ar, fee, min_order, is_active").order("governorate_ar");
    if (error || !data) return [];
    return (data as AdminZone[]).map((z) => ({ ...z, fee: Number(z.fee), min_order: Number(z.min_order) }));
  } catch {
    return [];
  }
}
