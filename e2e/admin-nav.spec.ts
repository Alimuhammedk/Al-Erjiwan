import { expect, test } from "@playwright/test";

// The admin tab bar, tried on a dev-only copy (no login needed).
const URL = "/styleguide/admin-nav";

test("the tabs are in the asked order (banners before categories), each with a small icon", async ({ page }) => {
  await page.goto(URL);
  const tabs = page.getByRole("navigation", { name: "قائمة الإدارة" }).getByRole("link");
  await expect(tabs).toHaveText(["الرئيسية", "الطلبات3", "البانرات", "الفئات", "المقالات", "الصفحات", "المنتجات", "المخزون", "الألوان", "التوصيل"]);
  await expect(tabs.locator("svg")).toHaveCount(10);
  for (const icon of ["stats", "orders", "banners", "categories", "articles", "pages", "products", "stock", "colours", "delivery"]) {
    await expect(page.locator(`svg[data-icon="${icon}"]`)).toHaveCount(1);
  }
});

test("the new-orders badge shows on the orders tab", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByTestId("new-orders-badge")).toHaveText("3");
});

test("tabs are easy to tap, and the bar scrolls sideways on a phone without widening the page", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto(URL);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  for (const box of await Promise.all((await page.getByRole("navigation", { name: "قائمة الإدارة" }).getByRole("link").all()).map((l) => l.boundingBox()))) {
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("navigation", { name: "قائمة الإدارة" }).screenshot({ path: "e2e/screenshots/admin-nav-375.png" });
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.getByRole("navigation", { name: "قائمة الإدارة" }).screenshot({ path: "e2e/screenshots/admin-nav-1280.png" });
});
