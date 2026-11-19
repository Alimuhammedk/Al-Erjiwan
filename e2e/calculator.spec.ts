import { expect, test } from "@playwright/test";

async function useCalculator(page: import("@playwright/test").Page) {
  await expect(page).toHaveURL(/\/calculator$/);
  await expect(page.getByRole("heading", { name: "حاسبة كمية الدهان", level: 1 })).toBeVisible();
  await page.getByLabel("الطول (متر)").fill("4");
  await page.getByLabel("العرض (متر)").fill("3");
  await page.getByLabel("الارتفاع (متر)").fill("2.5");
  await page.getByRole("button", { name: "احسب", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "7 لتر" })).toBeVisible();
}

test("the top bar ends with the calculator and then order tracking", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const links = page.getByRole("navigation", { name: "القائمة" }).getByRole("link");
  await expect(links).toHaveText(["الرئيسية", "المتجر", "منتقي الألوان", "حاسبة الدهان", "تتبع الطلب"]);
  await links.nth(3).click();
  await useCalculator(page);
});

test("the last link in the top bar opens order tracking, on desktop and in the phone menu", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("navigation", { name: "القائمة" }).getByRole("link").last().click();
  await expect(page).toHaveURL(/\/track$/);
  await expect(page.getByRole("navigation", { name: "القائمة" }).locator('a[aria-current="page"]')).toHaveText("تتبع الطلب");

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "القائمة" }).click();
  await page.locator("#mobile-menu").getByRole("link", { name: "تتبع الطلب" }).click();
  await expect(page).toHaveURL(/\/track$/);
});

test("the result is big, separate from the form and scrolled into view", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto("/calculator");
  await page.getByLabel("الطول (متر)").fill("4");
  await page.getByLabel("العرض (متر)").fill("3");
  await page.getByLabel("الارتفاع (متر)").fill("2.5");
  await page.getByRole("button", { name: "احسب", exact: true }).click();

  const number = page.getByTestId("litres-result");
  await expect(number).toHaveText("7");
  await expect(number).toBeInViewport();
  const size = await number.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(48);
  await expect(page.getByText("هذا تقدير")).toBeVisible();
  await page.waitForTimeout(600); // let the entrance animation finish before the screenshot
  await page.screenshot({ path: "e2e/screenshots/calculator-result-375.png" });
});

test("a wrong input shows a clear error instead of a number", async ({ page }) => {
  await page.goto("/calculator");
  await page.getByRole("button", { name: "احسب", exact: true }).click();
  await expect(page.getByTestId("litres-result")).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: "أدخل قياسات صحيحة" })).toBeVisible();
});

test("the calculator is in the phone menu too", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "القائمة" }).click();
  await page.locator("#mobile-menu").getByRole("link", { name: "حاسبة الدهان" }).click();
  await useCalculator(page);
});

test("the calculator page works by address and has no sideways scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/calculator");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: "e2e/screenshots/calculator-375.png", fullPage: true });
});

