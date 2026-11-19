import { sanitiseSearch } from "@/lib/shop/query";
import { normaliseHex } from "./hex";

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export type ColourQuery = { q: string; family: string | null; hex: string | null; page: number };

export const COLOURS_PER_PAGE = 24;

// The colour page reads its search from the address. Text that ends up in a database filter is cleaned, a hex must
// be a real colour, and a bad page number becomes a valid one.
export function parseColourQuery(params: Params): ColourQuery {
  const page = Number(first(params.page));
  const family = sanitiseSearch(first(params.family));
  const hexText = first(params.hex);
  return {
    q: sanitiseSearch(first(params.q)).slice(0, 40).trim(),
    family: family && family.length <= 40 ? family : null,
    hex: hexText ? normaliseHex(hexText) : null,
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, 500) : 1,
  };
}
