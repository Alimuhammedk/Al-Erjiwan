import { expect, test } from "@playwright/test";

// The homepage sections.
test("the homepage no longer has 'من أعمالنا'", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("من أعمالنا")).toHaveCount(0);
  await expect(page.getByText("ستظهر صور أعمالنا")).toHaveCount(0);
});

test("the calculator banner opens the calculator page", async ({ page }) => {
  await page.goto("/");
  const banner = page.getByTestId("calculator-banner");
  await expect(banner).toContainText("كم لتر دهان تحتاج؟");
  await banner.getByRole("link", { name: "افتح حاسبة الدهان" }).click();
  await expect(page).toHaveURL(/\/calculator$/);
});

test("the calculator banner sits before the reassurance lines, and the page fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const y = async (text: string) => (await page.getByText(text).first().boundingBox())!.y;
  expect(await y("كم لتر دهان تحتاج؟")).toBeLessThan(await y("توصيل إلى جميع محافظات العراق"));
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.screenshot({ path: "e2e/screenshots/home-sections-375.png", fullPage: true });
});
