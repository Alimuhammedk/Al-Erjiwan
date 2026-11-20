import { describe, expect, it } from "vitest";
import { BLOCKED_PATHS, absoluteUrl, jsonLdScript, organizationJsonLd, productJsonLd, siteUrl, sitemapEntries } from "../seo";

describe("siteUrl and absoluteUrl", () => {
  it("uses the configured address without a trailing slash or path", () => {
    expect(siteUrl("https://erjiwan.example/")).toBe("https://erjiwan.example");
    expect(siteUrl("https://erjiwan.example/shop?x=1")).toBe("https://erjiwan.example");
    expect(siteUrl("  http://localhost:4000  ")).toBe("http://localhost:4000");
  });
  it("falls back to localhost for anything missing or unsafe", () => {
    for (const bad of [undefined, "", "   ", "not a url", "javascript:alert(1)", "ftp://x.com", "//evil.com"]) expect(siteUrl(bad)).toBe("http://localhost:3000");
  });
  it("builds full addresses from a path with or without a leading slash", () => {
    expect(absoluteUrl("/shop", "https://a.com")).toBe("https://a.com/shop");
    expect(absoluteUrl("shop", "https://a.com")).toBe("https://a.com/shop");
  });
});

describe("jsonLdScript", () => {
  it("never lets text close the script tag", () => {
    const out = jsonLdScript({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("productJsonLd", () => {
  const base = { id: "p1", name: "بنتلايت", description: "وصف", brand: "جوهرة", image: "/seed/p1.png", base_price: 18000, sale_price: null, stock: 3, variants: [] as { price: number; stock: number }[] };
  it("describes an in-stock product with its price in dinar and its address", () => {
    const ld = productJsonLd(base, "https://a.com");
    expect(ld).toMatchObject({ "@type": "Product", name: "بنتلايت", description: "وصف", brand: { name: "جوهرة" }, image: "https://a.com/seed/p1.png" });
    expect(ld.offers).toMatchObject({ priceCurrency: "IQD", price: "18000", url: "https://a.com/shop/p1", availability: "https://schema.org/InStock" });
  });
  it("uses the sale price when there is a real sale, and ignores a sale that is not lower", () => {
    expect(productJsonLd({ ...base, sale_price: 15000 }, "https://a.com").offers.price).toBe("15000");
    expect(productJsonLd({ ...base, sale_price: 20000 }, "https://a.com").offers.price).toBe("18000");
  });
  it("with sizes, the price is the lowest size and it is in stock if any size is", () => {
    const ld = productJsonLd({ ...base, stock: 0, variants: [{ price: 60000, stock: 0 }, { price: 18000, stock: 2 }] }, "https://a.com");
    expect(ld.offers).toMatchObject({ price: "18000", availability: "https://schema.org/InStock" });
    const none = productJsonLd({ ...base, stock: 0, variants: [{ price: 60000, stock: 0 }, { price: 18000, stock: 0 }] }, "https://a.com");
    expect(none.offers.availability).toBe("https://schema.org/OutOfStock");
  });
  it("a sold-out plain product is out of stock", () => {
    expect(productJsonLd({ ...base, stock: 0 }, "https://a.com").offers.availability).toBe("https://schema.org/OutOfStock");
  });
  it("leaves out what is missing instead of writing null, and keeps https images as they are", () => {
    const ld = productJsonLd({ ...base, description: null, brand: null, image: "https://cdn.x/a.webp" }, "https://a.com");
    expect(ld).not.toHaveProperty("description");
    expect(ld).not.toHaveProperty("brand");
    expect(ld.image).toBe("https://cdn.x/a.webp");
    expect(productJsonLd({ ...base, image: null }, "https://a.com")).not.toHaveProperty("image");
  });
  it("cuts a very long description", () => {
    expect(productJsonLd({ ...base, description: "ا".repeat(900) }, "https://a.com").description).toHaveLength(500);
  });
});

describe("organizationJsonLd", () => {
  it("describes the shop", () => {
    expect(organizationJsonLd("متجر", "الكفل", "+9647838232417", "https://a.com")).toMatchObject({
      "@type": "Store", name: "متجر", url: "https://a.com", telephone: "+9647838232417", address: { addressCountry: "IQ" },
    });
  });
});

describe("sitemapEntries", () => {
  const data = { products: [{ id: "p1", created_at: "2026-11-01T00:00:00Z" }, { id: "p2" }], articles: [{ id: "a1", updated_at: "2026-11-02T00:00:00Z" }] };
  it("lists the main pages, the three pages, products and articles", () => {
    const urls = sitemapEntries(data, "https://a.com").map((e) => e.url);
    expect(urls).toEqual([
      "https://a.com/", "https://a.com/shop", "https://a.com/calculator",
      "https://a.com/about", "https://a.com/faq", "https://a.com/returns",
      "https://a.com/shop/p1", "https://a.com/shop/p2", "https://a.com/articles/a1",
    ]);
  });
  it("carries the date when there is one", () => {
    const entries = sitemapEntries(data, "https://a.com");
    expect(entries.find((e) => e.url.endsWith("/shop/p1"))).toHaveProperty("lastModified", "2026-11-01T00:00:00Z");
    expect(entries.find((e) => e.url.endsWith("/shop/p2"))).not.toHaveProperty("lastModified");
  });
  it("never lists admin, cart, checkout, order or tracking pages", () => {
    const urls = sitemapEntries(data, "https://a.com").map((e) => new URL(e.url).pathname);
    for (const blocked of BLOCKED_PATHS) expect(urls.some((p) => p.startsWith(blocked))).toBe(false);
  });
  it("is just the fixed pages with no data", () => {
    expect(sitemapEntries({ products: [], articles: [] }, "https://a.com")).toHaveLength(6);
  });
});

describe("BLOCKED_PATHS", () => {
  it("hides everything private", () => {
    expect([...BLOCKED_PATHS]).toEqual(["/admin", "/api", "/cart", "/checkout", "/order", "/track", "/styleguide"]);
  });
});
