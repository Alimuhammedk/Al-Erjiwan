import { expect, test } from "@playwright/test";

test("/admin without login ends at the login page", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("a deeper admin URL without login ends at the login page", async ({ page }) => {
  await page.goto("/admin/anything");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("login page is Arabic RTL with no shop header or WhatsApp button", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "تسجيل دخول المدير" })).toBeVisible();
  await expect(page.locator("header")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "تواصل عبر واتساب" })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("a wrong login shows the Arabic error", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("البريد الإلكتروني").fill("nobody@example.invalid");
  await page.getByLabel("كلمة المرور").fill("not-a-real-password");
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page.locator("form [role=alert]")).toHaveText("البريد الإلكتروني أو كلمة المرور غير صحيحة");
  await expect(page.getByLabel("البريد الإلكتروني")).toHaveValue("nobody@example.invalid"); // not wiped by the error
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("a garbage session cookie still ends at login with no server error", async ({ page, context }) => {
  await context.addCookies([
    { name: "sb-nnqegtfttsbvpmfxugjn-auth-token", value: "not-a-session", url: "http://localhost:3000" },
  ]);
  const response = await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(response?.status()).toBeLessThan(500);
});

for (const width of [375, 768, 1280]) {
  test(`login page at ${width}px has no sideways scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/admin/login");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await page.screenshot({ path: `e2e/screenshots/admin-login-${width}.png` });
  });
}
