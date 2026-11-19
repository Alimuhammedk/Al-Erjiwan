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
