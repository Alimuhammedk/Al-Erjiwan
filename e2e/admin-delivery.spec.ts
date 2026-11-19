import { expect, test } from "@playwright/test";

// The two delivery tabs, tried on the dev-only copy (real forms and real checks, sample data, nothing is saved).
const URL = "/styleguide/admin-delivery";

test("the fees table has every governorate, one save button, and keeps typed values after an error", async ({ page }) => {
  await page.goto(URL);
  for (const g of ["بغداد", "البصرة", "أربيل"]) await expect(page.getByRole("cell", { name: g, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "حفظ الأسعار" })).toHaveCount(1);
  await expect(page.getByLabel("سعر التوصيل بغداد")).toHaveValue("5000");
  await expect(page.getByLabel("متاحة أربيل")).not.toBeChecked();

  await page.getByLabel("سعر التوصيل بغداد").fill("-5");
  await page.getByLabel("الحد الأدنى للطلب البصرة").fill("12000");
  await page.getByRole("button", { name: "حفظ الأسعار" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "أدخل مبلغًا صحيحًا بالدينار" })).toHaveCount(1);
  await expect(page.getByLabel("سعر التوصيل بغداد")).toHaveValue("-5");
  await expect(page.getByLabel("الحد الأدنى للطلب البصرة")).toHaveValue("12000");
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("a good save sends the cleaned numbers (Arabic digits, blank means free)", async ({ page }) => {
  await page.goto(URL);
  await page.getByLabel("سعر التوصيل بغداد").fill("٦٬٠٠٠");
  await page.getByLabel("سعر التوصيل البصرة").fill("");
  await page.getByRole("button", { name: "حفظ الأسعار" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "ECHO:fees" })).toContainText("[[6000,0,true],[0,20000,true],[10000,0,false]]");
});

test("the same-price box fills every fee but saves nothing", async ({ page }) => {
  await page.goto(URL);
  await page.getByLabel("السعر الموحد", { exact: true }).fill("7000");
  await page.getByRole("button", { name: "تطبيق سعر موحد على الكل" }).click();
  for (const g of ["بغداد", "البصرة", "أربيل"]) await expect(page.getByLabel(`سعر التوصيل ${g}`)).toHaveValue("7000");
  await expect(page.getByRole("alert").filter({ hasText: "ECHO" })).toHaveCount(0);
  await page.getByRole("button", { name: "حفظ الأسعار" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "ECHO:fees" })).toContainText("[[7000,0,true],[7000,20000,true],[7000,0,false]]");
});

test("the company form checks the number and keeps the prices that were typed", async ({ page }) => {
  await page.goto(`${URL}?view=companies`);
  await page.getByLabel("اسم الشركة").fill("شركة السرعة");
  await page.getByLabel("رقم واتساب الشركة").fill("123");
  await page.getByLabel("ما تأخذه الشركة منك لكل محافظة: بغداد").fill("4000");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByText("أدخل رقم واتساب عراقيًا صحيحًا")).toBeVisible();
  await expect(page.getByLabel("ما تأخذه الشركة منك لكل محافظة: بغداد")).toHaveValue("4000");

  await page.getByLabel("رقم واتساب الشركة").fill("+964 780 123 4567");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "ECHO:company" })).toContainText("ECHO:company:07801234567:[4000]");
});

for (const view of ["", "?view=companies"]) {
  test(`the delivery forms fit a phone screen ${view}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`${URL}${view}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.screenshot({ path: `e2e/screenshots/admin-delivery${view ? "-company" : ""}-375.png`, fullPage: true });
  });
}
