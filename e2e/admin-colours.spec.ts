import { expect, test } from "@playwright/test";

// The admin colour form and CSV import, tried on dev-only copies (real checks, nothing is saved).
const URL = "/styleguide/admin-colours";
const HEAD = "system,code,name_ar,name_en,hex,family";

test("the colour form keeps what was typed, explains bad input on the field, and sends a clean hex", async ({ page }) => {
  await page.goto(URL);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("رمز اللون", { exact: true }).fill("JW-301");
  await page.getByLabel("رمز اللون (مثل #F3E9D2)").fill("red");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByText("هذا الحقل مطلوب")).toBeVisible();
  await expect(page.getByText("أدخل لونًا صحيحًا مثل #F3E9D2")).toBeVisible();
  await expect(page.getByLabel("رمز اللون", { exact: true })).toHaveValue("JW-301");

  await page.getByLabel("اسم اللون بالعربية").fill("أزرق سماوي");
  await page.getByLabel("رمز اللون (مثل #F3E9D2)").fill("BFE0F2");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "ECHO:colour" })).toHaveText("ECHO:colour:#bfe0f2:JW-301");
});

test("the colour box and the typed box stay in step", async ({ page }) => {
  await page.goto(URL);
  await page.waitForLoadState("networkidle");
  const typed = page.getByLabel("رمز اللون (مثل #F3E9D2)");
  await typed.fill("#112233");
  await expect(page.getByLabel("لون الشاشة التقريبي")).toHaveValue("#112233");
  await page.getByLabel("لون الشاشة التقريبي").fill("#445566");
  await expect(typed).toHaveValue("#445566");
});

test("the import page checks a file first and lists problems by line", async ({ page }) => {
  await page.goto(`${URL}?view=import`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "فحص الملف" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "اختر" })).toContainText("اختر ملفًا أولًا");

  const csv = `${HEAD}\nJW,A1,أزرق,,#112233,الأزرق\nJW,A2,,,#112233,\nJW,A3,لون,,red,\nJW,A1,أزرق ثان,,#445566,`;
  await page.locator('input[type="file"]').setInputFiles({ name: "colours.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "فحص الملف" }).click();
  await expect(page.getByRole("status")).toHaveText("صفوف صالحة: 1. صفوف فيها أخطاء: 2.");
  const issues = page.getByTestId("import-issues").getByRole("listitem");
  await expect(issues).toHaveCount(3);
  await expect(issues.nth(0)).toContainText("السطر 3");
  await expect(issues.nth(1)).toContainText("السطر 4");
  await expect(issues.nth(2)).toContainText("السطر 5");
});

test("importing sends only the good rows", async ({ page }) => {
  await page.goto(`${URL}?view=import`);
  await page.waitForLoadState("networkidle");
  const csv = `${HEAD}\nJW,A1,أزرق,,#112233,الأزرق\nJW,A2,,,#112233,\nJW,A3,أحمر,,#ff0000,الأحمر`;
  await page.locator('input[type="file"]').setInputFiles({ name: "c.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "استيراد الألوان" }).click();
  await expect(page.getByRole("status")).toHaveText("ECHO:import:2");

  await page.locator('input[type="file"]').setInputFiles({ name: "bad.csv", mimeType: "text/csv", buffer: Buffer.from(`${HEAD}\nJW,A1,,,bad,`) });
  await page.getByRole("button", { name: "استيراد الألوان" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "صفوف" })).toContainText("لا توجد صفوف صالحة للاستيراد");
});

for (const view of ["", "?view=import"]) {
  test(`the colour pages fit a phone screen ${view}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`${URL}${view}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.screenshot({ path: `e2e/screenshots/admin-colours${view ? "-import" : ""}-375.png`, fullPage: true });
  });
}
