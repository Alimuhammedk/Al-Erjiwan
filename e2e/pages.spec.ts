import { expect, test, type Page } from "@playwright/test";

// The four pages and the store map, tried on a dev-only copy with sample text (same page component), the admin
// form (real checks, nothing saved), and the real footer links.
const SAMPLE = "/styleguide/pages";
const useEnglish = (page: Page) => page.context().addCookies([{ name: "lang", value: "en", url: "http://localhost:3000" }]);

test("a page shows its title and paragraphs, in Arabic by default", async ({ page }) => {
  await page.goto(`${SAMPLE}?slug=returns`);
  await expect(page.getByRole("heading", { name: "من نحن", level: 1 })).toBeVisible();
  await expect(page.getByTestId("page-view").locator("p").filter({ hasText: "أصباغ الأرجوان متجر للدهانات" })).toBeVisible();
  await expect(page.getByTestId("page-view").locator("p").filter({ hasText: "نوصّل إلى جميع المحافظات." })).toBeVisible();
  await expect(page.getByRole("link", { name: "العودة إلى الرئيسية" })).toHaveAttribute("href", "/");
});

test("FAQ shows only the questions, and a tap opens the answer", async ({ page }) => {
  await page.goto(`${SAMPLE}?slug=faq`);
  const list = page.getByTestId("faq-list");
  await expect(list.locator("summary")).toHaveCount(1);
  await expect(list.getByText("أصباغ الأرجوان متجر للدهانات")).toBeVisible();
  await expect(list.getByText("نوصّل إلى جميع المحافظات.")).toBeHidden();
  await list.locator("summary").click();
  await expect(list.getByText("نوصّل إلى جميع المحافظات.")).toBeVisible();
  await list.locator("summary").click();
  await expect(list.getByText("نوصّل إلى جميع المحافظات.")).toBeHidden();
});

test("in English the page shows the English text, and the Arabic when there is none", async ({ page }) => {
  await useEnglish(page);
  await page.goto(`${SAMPLE}?slug=returns`);
  await expect(page.getByRole("heading", { name: "About us", level: 1 })).toBeVisible();
  await expect(page.getByText("Al-Erjiwan is a paint shop in Al-Kifl.")).toBeVisible();
  await page.goto(`${SAMPLE}?slug=returns&english=0`);
  await expect(page.getByRole("heading", { name: "من نحن", level: 1 })).toBeVisible();
});

test("only the About page has a map, and it is a Google map with an Open in Maps button", async ({ page }) => {
  await page.goto(`${SAMPLE}?slug=about&map=${encodeURIComponent("32.2045, 44.3321")}`);
  const map = page.getByTestId("store-map");
  await expect(map).toBeVisible();
  await expect(map.locator("iframe")).toHaveAttribute("src", "https://maps.google.com/maps?q=32.2045,44.3321&z=16&output=embed");
  await expect(map.locator("iframe")).toHaveAttribute("loading", "lazy");
  await expect(map.getByRole("link", { name: "افتح في خرائط جوجل" })).toHaveAttribute("href", "https://www.google.com/maps?q=32.2045,44.3321");
  await expect(map.getByRole("link", { name: "افتح في خرائط جوجل" })).toHaveAttribute("rel", /noopener/);

  await page.goto(`${SAMPLE}?slug=faq&map=${encodeURIComponent("32.2045, 44.3321")}`);
  await expect(page.getByTestId("store-map")).toHaveCount(0);
});

test("a short link shows only the button, and a bad or empty link shows nothing", async ({ page }) => {
  await page.goto(`${SAMPLE}?slug=about&map=${encodeURIComponent("https://maps.app.goo.gl/AbC123")}`);
  await expect(page.getByTestId("store-map").locator("iframe")).toHaveCount(0);
  await expect(page.getByTestId("store-map").getByRole("link")).toHaveAttribute("href", "https://maps.app.goo.gl/AbC123");
  for (const bad of ["https://evil.com/map", "javascript:alert(1)", "<script>alert(1)</script>", ""]) {
    await page.goto(`${SAMPLE}?slug=about&map=${encodeURIComponent(bad)}`);
    await expect(page.getByTestId("store-map"), bad).toHaveCount(0);
    await expect(page.locator("iframe")).toHaveCount(0);
  }
});

test("the English map button is in English", async ({ page }) => {
  await useEnglish(page);
  await page.goto(`${SAMPLE}?slug=about&map=${encodeURIComponent("32.2,44.3")}`);
  await expect(page.getByRole("heading", { name: "Store location" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in Google Maps" })).toBeVisible();
});

for (const [name, width] of [["phone", 375], ["tablet", 768], ["desktop", 1280]] as const) {
  test(`the page and its map fit a ${name} screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${SAMPLE}?slug=about&map=${encodeURIComponent("32.2045, 44.3321")}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    const box = (await page.getByTestId("store-map").locator("iframe").boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `e2e/screenshots/page-about-${width}.png`, fullPage: true });
  });
}

test("the footer links to the three pages in Arabic and in English", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  for (const [label, href] of [["من نحن", "/about"], ["الأسئلة الشائعة", "/faq"], ["سياسة الإرجاع", "/returns"]]) {
    await expect(footer.getByRole("link", { name: label })).toHaveAttribute("href", href);
  }
  await useEnglish(page);
  await page.goto("/");
  for (const label of ["About us", "FAQ", "Return policy"]) await expect(page.getByRole("contentinfo").getByRole("link", { name: label })).toBeVisible();
});

test("the real pages open (needs 0009 run in Supabase)", async ({ page, request }) => {
  const res = await request.get("/about");
  test.skip(res.status() !== 200, "0009_languages_and_pages.sql has not been run yet");
  for (const path of ["/about", "/faq", "/returns"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("an unknown address says not found, in both languages", async ({ page }) => {
  const missing = await page.goto("/no-such-page");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "الصفحة غير موجودة" })).toBeVisible();
  await useEnglish(page);
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test.describe("the admin page form", () => {
  const ADMIN = "/styleguide/admin-page";

  test("shows the map box only on the About page and tells you whether the link works", async ({ page }) => {
    await page.goto(`${ADMIN}?slug=faq`);
    await expect(page.getByLabel("موقع المتجر على خرائط جوجل")).toHaveCount(0);
    await page.goto(ADMIN);
    await page.waitForLoadState("networkidle");
    const box = page.getByLabel("موقع المتجر على خرائط جوجل");
    await box.fill("32.2045, 44.3321");
    await expect(page.getByTestId("map-status")).toHaveText("سيظهر الموقع في صفحة من نحن.");
    await box.fill("https://maps.app.goo.gl/AbC123");
    await expect(page.getByTestId("map-status")).toContainText("رابط قصير");
    await box.fill("https://evil.com");
    await expect(page.getByTestId("map-status")).toContainText("الرابط غير صالح");
    await box.fill("");
    await expect(page.getByTestId("map-status")).toHaveCount(0);
  });

  test("refuses a bad map link on save, keeps what was typed, and sends a good page", async ({ page }) => {
    await page.goto(ADMIN);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("النص بالعربية").fill("نص جديد");
    await page.getByLabel("موقع المتجر على خرائط جوجل").fill("https://evil.com");
    await page.getByRole("button", { name: "حفظ", exact: true }).click();
    await expect(page.getByText("الرابط غير صالح. الصق رابطًا", { exact: false }).first()).toBeVisible();
    await expect(page.getByLabel("النص بالعربية")).toHaveValue("نص جديد");
    await page.getByLabel("موقع المتجر على خرائط جوجل").fill("32.2, 44.3");
    await page.getByRole("button", { name: "حفظ", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "ECHO:" })).toContainText('"map_url":"32.2, 44.3"');
  });

  test("fits a phone screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(ADMIN);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.screenshot({ path: "e2e/screenshots/admin-page-375.png", fullPage: true });
  });
});
