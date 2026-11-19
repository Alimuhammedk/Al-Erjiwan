import { expect, test, type Page } from "@playwright/test";

// Search engine basics: titles, descriptions, share tags, canonical addresses, product data, robots and sitemap.
const useEnglish = (page: Page) => page.context().addCookies([{ name: "lang", value: "en", url: "http://localhost:3000" }]);
const meta = (page: Page, sel: string) => page.locator(sel).first().getAttribute("content");

test("home has a title, description, share tags, canonical link and the shop's data", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/أصباغ الأرجوان/);
  expect(await meta(page, 'meta[name="description"]')).toBeTruthy();
  expect(await meta(page, 'meta[property="og:title"]')).toBeTruthy();
  expect(await meta(page, 'meta[property="og:locale"]')).toBe("ar_IQ");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
  expect(ld["@type"]).toBe("Store");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});

test("English changes the title language and share locale", async ({ page }) => {
  await useEnglish(page);
  await page.goto("/");
  expect(await meta(page, 'meta[property="og:locale"]')).toBe("en_US");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("a product has its own title, canonical link and price data that match the page", async ({ page, request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const path = xml.match(/<loc>[^<]*?(\/shop\/[^<]+)<\/loc>/)?.[1];
  test.skip(!path, "no products in the shop");
  await page.goto(path!);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const name = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  await expect(page).toHaveTitle(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
  expect(ld["@type"]).toBe("Product");
  expect(ld.offers.priceCurrency).toBe("IQD");
  expect(Number(ld.offers.price)).toBeGreaterThan(0);
});

test("a missing product is not indexed", async ({ page }) => {
  await page.goto("/shop/00000000-0000-0000-0000-000000000000");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
});

test("robots.txt blocks private areas and points to the sitemap", async ({ request }) => {
  const txt = await (await request.get("/robots.txt")).text();
  for (const p of ["/admin", "/api", "/cart", "/checkout", "/order", "/track"]) expect(txt).toContain(`Disallow: ${p}`);
  expect(txt).toMatch(/Sitemap: .*\/sitemap\.xml/);
});

test("sitemap lists the main pages and never private ones", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/shop", "/calculator", "/about", "/faq", "/returns", "/privacy"]) expect(xml).toContain(`${p}</loc>`);
  for (const p of ["/admin", "/cart", "/checkout", "/track", "/styleguide"]) expect(xml).not.toContain(`${p}`);
});
