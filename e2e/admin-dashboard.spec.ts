import { expect, test } from "@playwright/test";

// The admin home and the stock list, tried on dev-only copies with sample data (nothing is saved).
const URL = "/styleguide/admin-dashboard";

test("the dashboard shows every order status, sales and stock health", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("heading", { name: "لوحة التحكم", level: 1 })).toBeVisible();
  for (const [s, n] of [["new", "3"], ["confirmed", "2"], ["shipped", "1"], ["delivered", "14"], ["cancelled", "2"], ["returned", "1"]]) {
    await expect(page.getByTestId(`status-${s}`)).toContainText(n);
    await expect(page.getByTestId(`status-${s}`)).toHaveAttribute("href", `/admin/orders?status=${s}`);
  }
  await expect(page.getByTestId("orders-today")).toHaveText("4");
  await expect(page.getByTestId("sales-today")).toHaveText("345,000 د.ع");
  await expect(page.getByTestId("sales-month")).toHaveText("4,120,000 د.ع");
  await expect(page.getByTestId("stock-available")).toHaveText("18");
  await expect(page.getByTestId("stock-low")).toHaveText("3");
  await expect(page.getByTestId("stock-out")).toHaveText("2");
});

test("it lists what needs attention, the best sellers and the latest orders", async ({ page }) => {
  await page.goto(URL);
  const low = page.getByTestId("low-stock-list");
  await expect(low).toContainText("فرشاة طلاء احترافية");
  await expect(low).toContainText("بنتلايت داخلي ممتاز · 1 لتر");
  await expect(low).toContainText("نفد");
  await expect(page.getByTestId("best-sellers")).toContainText("1. بنتلايت داخلي ممتاز");
  await expect(page.getByTestId("best-sellers")).toContainText("24 قطعة");
  await expect(page.getByTestId("latest-orders").getByRole("link")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "فتح صفحة المخزون" })).toHaveAttribute("href", "/admin/stock");
});

test("with nothing yet, it says so instead of showing broken blocks", async ({ page }) => {
  await page.goto(`${URL}?state=empty`);
  await expect(page.getByText("كل المنتجات متوفرة بكميات جيدة")).toBeVisible();
  await expect(page.getByText("لا توجد مبيعات بعد")).toBeVisible();
  await expect(page.getByText("لا توجد طلبات بعد")).toBeVisible();
  await expect(page.getByTestId("status-new")).toContainText("0");
});

test("when the numbers cannot be loaded, it says so", async ({ page }) => {
  await page.goto(`${URL}?state=error`);
  await expect(page.getByRole("alert").filter({ hasText: "تعذر تحميل الأرقام" })).toBeVisible();
});

for (const [name, width] of [["phone", 375], ["tablet", 768], ["desktop", 1280]] as const) {
  test(`the dashboard fits a ${name} screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(URL);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.screenshot({ path: `e2e/screenshots/admin-dashboard-${width}.png`, fullPage: true });
  });
}

test("the stock list shows every row with its level and quick buttons", async ({ page }) => {
  await page.goto(`${URL}?view=stock`);
  const rows = page.getByTestId("stock-row");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("نفد");
  await expect(rows.nth(1)).toContainText("منخفض");
  await expect(rows.nth(1)).toContainText("4 لتر");
  await expect(rows.nth(2)).toContainText("متوفر");
  await expect(rows.nth(2)).toContainText("مخفي");
  for (const name of ["وصلت كمية", "بيع من المحل", "تعديل الرقم"]) await expect(rows.nth(0).getByRole("button", { name })).toBeVisible();
});

test("each stock button sends the right change, and a bad number is explained", async ({ page }) => {
  await page.goto(`${URL}?view=stock`);
  const row = page.getByTestId("stock-row").nth(1);
  const box = row.getByRole("textbox");
  await box.fill("10");
  await row.getByRole("button", { name: "وصلت كمية" }).click();
  await expect(row.getByRole("alert")).toHaveText("ECHO:10:manual");
  await row.getByRole("button", { name: "بيع من المحل" }).click();
  await expect(row.getByRole("alert")).toHaveText("ECHO:-10:shop_sale");
  await row.getByRole("button", { name: "تعديل الرقم" }).click();
  await expect(row.getByRole("alert")).toHaveText("ECHO:7:manual");

  await box.fill("٣");
  await row.getByRole("button", { name: "تعديل الرقم" }).click();
  await expect(row.getByRole("alert")).toHaveText("الرقم نفسه، لا يوجد تغيير");
  await box.fill("abc");
  await row.getByRole("button", { name: "وصلت كمية" }).click();
  await expect(row.getByRole("alert")).toHaveText("أدخل عددًا صحيحًا");
  await expect(box).toHaveValue("abc");
});

test("the stock list fits a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${URL}?view=stock`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.screenshot({ path: "e2e/screenshots/admin-stock-375.png", fullPage: true });
});
