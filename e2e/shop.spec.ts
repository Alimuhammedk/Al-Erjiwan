import { expect, test } from "@playwright/test";

test("shop page shows the title and the search field", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "المتجر" })).toBeVisible();
  await expect(page.getByPlaceholder("ابحث عن منتج")).toBeVisible();
});

test("strange filter values do not break the shop", async ({ page }) => {
  const response = await page.goto("/shop?sort=zzz&min=-5&max=abc&page=0&q=%2C%28%29%25%22%2A");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByRole("heading", { name: "المتجر" })).toBeVisible();
});

test("a long search text is cut and accepted without an error", async ({ page }) => {
  const response = await page.goto(`/shop?q=${"ا".repeat(500)}`);
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByRole("heading", { name: "المتجر" })).toBeVisible();
});

for (const path of ["/shop/not-a-uuid", "/shop/123e4567-e89b-12d3-a456-426614174000"]) {
  test(`${path} shows the Arabic not-found page`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "المنتج غير موجود" })).toBeVisible();
  });
}

test("the header has a cart link", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("link", { name: "السلة" })).toBeVisible();
});

for (const width of [375, 768, 1280]) {
  test(`shop at ${width}px has no sideways scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/shop");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await page.screenshot({ path: `e2e/screenshots/shop-${width}.png`, fullPage: true });
  });
}
