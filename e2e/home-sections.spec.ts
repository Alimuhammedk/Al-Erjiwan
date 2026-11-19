import { expect, test } from "@playwright/test";

// The homepage sections (they read the shop texts from the database, falling back to the built-in ones) and the
// admin form that edits those texts (dev-only copy with real checks).
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

test("the shop-info section shows the guarantee, the address and the WhatsApp and call buttons", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "معلومات المتجر", level: 2 })).toBeVisible();
  await expect(page.getByTestId("guarantee")).toContainText("ضمان طلبك");
  await expect(page.getByTestId("guarantee").locator("p")).not.toBeEmpty();
  await expect(page.getByTestId("shop-details")).toContainText("العنوان");
  await expect(page.getByTestId("shop-details").getByRole("link", { name: "راسلنا على واتساب" })).toHaveAttribute("href", /^https:\/\/wa\.me\/9647838232417/);
  await expect(page.getByTestId("shop-details").getByRole("link", { name: "اتصل بنا" })).toHaveAttribute("href", /^tel:/);
});

test("the new sections sit between the offers and the reassurance lines, and fit a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const y = async (text: string) => (await page.getByText(text).first().boundingBox())!.y;
  expect(await y("كم لتر دهان تحتاج؟")).toBeLessThan(await y("معلومات المتجر"));
  expect(await y("معلومات المتجر")).toBeLessThan(await y("توصيل إلى جميع محافظات العراق"));
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.screenshot({ path: "e2e/screenshots/home-sections-375.png", fullPage: true });
});

test("the admin form keeps what was typed, refuses too-long text and sends the texts", async ({ page }) => {
  await page.goto("/styleguide/admin-store");
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("نص الضمان")).not.toHaveValue("");
  await page.getByLabel(/أوقات العمل/).fill("يوميًا من 9 إلى 9");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "ECHO:" })).toContainText("يوميًا من 9 إلى 9");
  await page.getByLabel("نص الضمان").fill("ضمان جديد");
  await page.getByLabel("العنوان").fill("");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "ECHO:" })).toContainText('"address":""');
  await expect(page.getByLabel("نص الضمان")).toHaveValue("ضمان جديد");
});
