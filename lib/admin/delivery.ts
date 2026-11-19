// Delivery companies and fees: reading prices and checking what the owner types.

type Zone = { governorate_ar: string };
export type PriceRow = { price: number | string; delivery_zones: Zone | Zone[] | null };

// What a company charges for one governorate; null when it has no price for it.
export function priceForGovernorate(rows: PriceRow[] | null | undefined, governorate: string): number | null {
  for (const r of rows ?? []) {
    const zone = Array.isArray(r.delivery_zones) ? r.delivery_zones[0] : r.delivery_zones;
    if (zone?.governorate_ar === governorate) return Number(r.price);
  }
  return null;
}

// A company as the order page offers it: its price for that order's governorate (null = none).
export type CompanyOption = { id: string; name: string; whatsapp: string; price: number | null };
