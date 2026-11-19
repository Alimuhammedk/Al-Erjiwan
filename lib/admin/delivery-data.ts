import { createAuthClient } from "@/lib/supabase/auth-server";
import { priceForGovernorate, type CompanyOption, type PriceRow } from "./delivery";

// Active delivery companies with what each charges for one governorate. Empty if anything goes wrong.
export async function getCompanyOptions(governorate: string): Promise<CompanyOption[]> {
  try {
    const db = await createAuthClient();
    const { data, error } = await db
      .from("delivery_companies")
      .select("id, name, whatsapp, delivery_company_prices(price, delivery_zones(governorate_ar))")
      .eq("is_active", true)
      .order("sort_order")
      .order("name");
    if (error || !data) return [];
    return (data as unknown as { id: string; name: string; whatsapp: string; delivery_company_prices: PriceRow[] | null }[]).map((c) => ({
      id: c.id,
      name: c.name,
      whatsapp: c.whatsapp,
      price: priceForGovernorate(c.delivery_company_prices, governorate),
    }));
  } catch {
    return [];
  }
}

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

export type CompanyRow = { id: string; name: string; whatsapp: string; notes: string | null; is_active: boolean; prices: Record<string, number> };

type RawCompany = Omit<CompanyRow, "prices"> & { delivery_company_prices: { zone_id: string; price: number | string }[] | null };
const toRow = ({ delivery_company_prices, ...c }: RawCompany): CompanyRow => ({
  ...c,
  prices: Object.fromEntries((delivery_company_prices ?? []).map((p) => [p.zone_id, Number(p.price)])),
});
const COLUMNS = "id, name, whatsapp, notes, is_active, delivery_company_prices(zone_id, price)";

export async function listCompanies(): Promise<CompanyRow[]> {
  try {
    const db = await createAuthClient();
    const { data, error } = await db.from("delivery_companies").select(COLUMNS).order("sort_order").order("name");
    return error || !data ? [] : (data as unknown as RawCompany[]).map(toRow);
  } catch {
    return [];
  }
}

export async function getCompany(id: string): Promise<CompanyRow | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  try {
    const db = await createAuthClient();
    const { data, error } = await db.from("delivery_companies").select(COLUMNS).eq("id", id).maybeSingle();
    return error || !data ? null : toRow(data as unknown as RawCompany);
  } catch {
    return null;
  }
}
