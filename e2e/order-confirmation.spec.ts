import { expect, test } from "@playwright/test";

// The confirmation page, tried on the dev-only copy (same page, sample order, nothing is created).
const URL = "/styleguide/order-confirmation";

test("shows the order number big, the items, and what to pay on delivery", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("heading", { name: "تم استلام طلبك", level: 1 })).toBeVisible();
  await expect(page.getByText("ABCD1234", { exact: true })).toBeVisible();
  await expect(page.getByText("بنتلايت داخلي ممتاز (4 لتر)")).toBeVisible();
  await expect(page.getByText("123,000 د.ع")).toBeVisible();
});

test("the order number can be copied with one tap", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(URL);
  await page.getByRole("button", { name: "نسخ رقم الطلب" }).click();
  await expect(page.getByRole("button", { name: "تم النسخ" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("ABCD1234");
});

test("there is no button that sends the order details by WhatsApp", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByText("أرسل تفاصيل الطلب")).toHaveCount(0);
  await expect(page.locator('main a[href*="wa.me"]')).toHaveCount(0);
});

test("it still links to tracking and back to the shop", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("main").getByRole("link", { name: "تتبع طلبك" })).toHaveAttribute("href", "/track");
  await expect(page.getByRole("main").getByRole("link", { name: "متابعة التسوق" })).toHaveAttribute("href", "/shop");
});

test("fits a phone screen and the number box is easy to tap", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(URL);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  const box = (await page.getByRole("button", { name: "نسخ رقم الطلب" }).boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: "e2e/screenshots/order-confirmation-375.png", fullPage: true });
});
