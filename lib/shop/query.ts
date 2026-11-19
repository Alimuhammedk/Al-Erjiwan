import { parsePrice } from "@/lib/admin/validate";

export const PAGE_SIZE = 24;
const MAX_PAGE = 500;
const SORTS = ["newest", "price_asc", "price_desc"] as const;
export type Sort = (typeof SORTS)[number];

export type ShopQuery = {
  q: string;
  category: string | null;
  brand: string | null;
  min: number | null;
  max: number | null;
  sort: Sort;
  page: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Search text ends up inside a database filter string, so drop the characters that have meaning there.
export function sanitiseSearch(text: string): string {
  return text.replace(/[,()%*"'\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60).trim();
}

export function parseShopQuery(params: Params): ShopQuery {
  const sort = first(params.sort);
  let min = parsePrice(first(params.min));
  let max = parsePrice(first(params.max));
  if (min !== null && max !== null && min > max) [min, max] = [max, min];

  const page = parsePrice(first(params.page));
  const category = first(params.category);
  const brand = first(params.brand).trim().slice(0, 100);

  return {
    q: sanitiseSearch(first(params.q)),
    category: UUID.test(category) ? category : null,
    brand: brand || null,
    min,
    max,
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as Sort) : "newest",
    page: page === null || page < 1 ? 1 : Math.min(page, MAX_PAGE),
  };
}
