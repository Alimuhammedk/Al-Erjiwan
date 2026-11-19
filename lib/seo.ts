import { PAGE_SLUGS } from "@/lib/pages";
import { discountPercent, displayPrice, isSoldOut } from "@/lib/shop/product";

const FALLBACK = "http://localhost:3000";

// The public address of the shop, from the environment (never from a visitor's request). No trailing slash.
export function siteUrl(env: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  const value = (env ?? "").trim();
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return FALLBACK;
    return url.origin;
  } catch {
    return FALLBACK;
  }
}

export const absoluteUrl = (path: string, base = siteUrl()) => `${base}${path.startsWith("/") ? path : `/${path}`}`;

// Text put inside a <script type="application/ld+json"> tag: "<" is escaped so nothing in a name or description
// can close the tag.
export const jsonLdScript = (data: unknown): string =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");

type ProductLd = {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  image: string | null;
  base_price: number;
  sale_price: number | null;
  stock: number;
  variants: { price: number; stock: number }[];
};

// What Google reads about a product. The price is the "from" price (the lowest size, or the sale price), and the
// availability follows the real stock, so it always matches what the page says.
export function productJsonLd(p: ProductLd, base = siteUrl()) {
  const prices = p.variants.length ? p.variants.map((v) => v.price) : [displayPrice(p).price];
  const price = Math.min(...prices);
  const soldOut = isSoldOut(p, p.variants);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    ...(p.description ? { description: p.description.slice(0, 500) } : {}),
    ...(p.image ? { image: p.image.startsWith("http") ? p.image : absoluteUrl(p.image, base) } : {}),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/shop/${p.id}`, base),
      priceCurrency: "IQD",
      price: String(Math.round(price)),
      availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

// The shop itself, for the home page.
export function organizationJsonLd(name: string, address: string, phone: string, base = siteUrl()) {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name,
    url: base,
    telephone: phone,
    address: { "@type": "PostalAddress", streetAddress: address, addressCountry: "IQ" },
  };
}

type Entry = { url: string; lastModified?: string };

// Every public address worth listing: the main pages, the four pages, shown products and published articles.
// Hidden or draft items never appear.
export function sitemapEntries(
  data: { products: { id: string; created_at?: string }[]; articles: { id: string; updated_at?: string }[] },
  base = siteUrl(),
): Entry[] {
  const fixed = ["/", "/shop", "/calculator", ...PAGE_SLUGS.map((s) => `/${s}`)].map((p) => ({ url: absoluteUrl(p, base) }));
  const products = data.products.map((p) => ({ url: absoluteUrl(`/shop/${p.id}`, base), ...(p.created_at ? { lastModified: p.created_at } : {}) }));
  const articles = data.articles.map((a) => ({ url: absoluteUrl(`/articles/${a.id}`, base), ...(a.updated_at ? { lastModified: a.updated_at } : {}) }));
  return [...fixed, ...products, ...articles];
}

// What search engines may not visit.
export const BLOCKED_PATHS = ["/admin", "/api", "/cart", "/checkout", "/order", "/track", "/styleguide"] as const;

export { discountPercent };
