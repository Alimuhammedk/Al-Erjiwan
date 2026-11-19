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

test("the top bar has a calculator link right after the home link", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const links = page.getByRole("navigation", { name: "القائمة" }).getByRole("link");
  await expect(links.nth(0)).toHaveText("الرئيسية");
  await expect(links.nth(1)).toHaveText("حاسبة الدهان");
  await links.nth(1).click();
  await useCalculator(page);
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

test("bad measurements show the Arabic message", async ({ page }) => {
  await page.goto("/calculator");
  await page.getByRole("button", { name: "احسب", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "أدخل قياسات صحيحة" })).toBeVisible();
});
