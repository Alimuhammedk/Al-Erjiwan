import { expect, test, type Page } from "@playwright/test";

// These tests need the dummy data from supabase/seed/dummy-data.sql. They skip themselves when it isn't loaded.
const P = (n: number) => `00000000-0000-4002-8000-${String(n).padStart(12, "0")}`;
const C3 = "00000000-0000-4001-8000-000000000003";

test.beforeAll(async ({ request }) => {
  const r = await request.get(`/shop/${P(1)}`);
  test.skip(r.status() !== 200, "dummy data is not loaded");
});

const cards = (page: Page) => page.locator('main a[href^="/shop/0000"]');

test("the shop lists the 10 visible products and hides the hidden one", async ({ page }) => {
  await page.goto("/shop");
  await expect(cards(page)).toHaveCount(10);
  await expect(page.getByText("مخفي للاختبار")).toHaveCount(0);
});

test("search finds a product by name", async ({ page }) => {
  await page.goto("/shop?q=فرشاة");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText("فرشاة طلاء احترافية");
});

test("room, finish, category and price filters narrow the list", async ({ page }) => {
  await page.goto("/shop?room=المطبخ");
  await expect(cards(page)).toHaveCount(2);
  await page.goto("/shop?finish=لامع");
  await expect(cards(page)).toHaveCount(2);
  await page.goto(`/shop?category=${C3}`);
  await expect(cards(page)).toHaveCount(2);
  await page.goto("/shop?min=8000&max=9000");
  await expect(cards(page)).toHaveCount(1);
});

test("sorting by price puts the cheapest first", async ({ page }) => {
  await page.goto("/shop?sort=price_asc");
  await expect(cards(page).first()).toContainText("فرشاة طلاء احترافية");
});

test("the filter form works without typing a URL", async ({ page }) => {
  await page.goto("/shop");
  await page.getByLabel("الغرفة").selectOption("المطبخ");
  await page.getByRole("button", { name: "تطبيق" }).click();
  await expect(page).toHaveURL(/room=/);
  await expect(cards(page)).toHaveCount(2);
});

test("a size changes the price and a sold-out size is disabled", async ({ page }) => {
  await page.goto(`/shop/${P(1)}`);
  await expect(page.getByText("18,000 د.ع").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /18 لتر/ })).toBeDisabled();
  await page.getByRole("button", { name: "4 لتر" }).click();
  await expect(page.getByText("60,000 د.ع").first()).toBeVisible();
});

test("a tinted paint needs a colour, then adds to the cart", async ({ page }) => {
  await page.route("**/api/colours*", (route) =>
    route.fulfill({ json: { colours: [{ id: C3, name_ar: "أزرق سماوي", code: "JW-301", hex: "#bfe0f2", family: "الأزرق", system: null }] } }),
  );
  await page.goto(`/shop/${P(1)}`);
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByText("اختر لونًا أو اكتب اسمه أو رقمه")).toBeVisible();
  await page.getByTestId("colour-row").click();
  await page.getByRole("button", { name: "أزرق سماوي" }).click();
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByText("تمت الإضافة إلى السلة")).toBeVisible();
  await expect(page.getByRole("link", { name: "السلة (1)" })).toBeVisible();
});

test("a sold-out ready-made colour cannot be added", async ({ page }) => {
  await page.goto(`/shop/${P(3)}`);
  await page.getByRole("button", { name: "رمادي فاتح" }).click();
  await expect(page.getByRole("button", { name: "نفدت الكمية" }).last()).toBeDisabled();
});

test("a sold-out product cannot be added", async ({ page }) => {
  await page.goto(`/shop/${P(8)}`);
  await expect(page.getByRole("button", { name: "نفدت الكمية" })).toBeDisabled();
});

test("a sale price shows with the old price struck", async ({ page }) => {
  await page.goto(`/shop/${P(6)}`);
  await expect(page.getByText("38,000 د.ع").first()).toBeVisible();
  await expect(page.locator("main .line-through").first()).toHaveText("45,000 د.ع");
});

test("a hidden product opens the not-found page", async ({ page }) => {
  const response = await page.goto(`/shop/${P(10)}`);
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "المنتج غير موجود" })).toBeVisible();
});

test("the product page has no calculator box, only a link to the calculator page", async ({ page }) => {
  await page.goto(`/shop/${P(1)}`);
  await expect(page.getByLabel("الطول (متر)")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "احسب كمية الدهان" })).toHaveCount(0);
  await page.getByRole("link", { name: "لست متأكدًا من الكمية؟ احسب كمية الدهان" }).click();
  await expect(page).toHaveURL(/\/calculator$/);
  await page.getByLabel("الطول (متر)").fill("4");
  await page.getByLabel("العرض (متر)").fill("3");
  await page.getByLabel("الارتفاع (متر)").fill("2.5");
  await page.getByRole("button", { name: "احسب", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "7 لتر" })).toBeVisible();
});

test("add a simple product, then change quantity in the cart", async ({ page }) => {
  await page.goto(`/shop/${P(7)}`);
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await page.getByRole("link", { name: "السلة (1)" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText("فرشاة طلاء احترافية")).toBeVisible();
  await expect(page.getByText("8,000 د.ع").first()).toBeVisible();
  await page.getByRole("button", { name: "زيادة الكمية" }).click();
  await expect(page.getByText("16,000 د.ع").first()).toBeVisible();
});

test("the homepage shows banners, categories, best sellers and offers, and cards open products", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^الشريحة \d/ })).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "تسوّق حسب الفئة" })).toBeVisible();
  const offers = page.locator("section", { has: page.getByRole("heading", { name: "العروض" }) });
  await expect(offers.locator('a[href^="/shop/0000"]')).toHaveCount(2);
  await page.locator('main a[href^="/shop/0000"]').first().click();
  await expect(page).toHaveURL(/\/shop\/0000/);
});
