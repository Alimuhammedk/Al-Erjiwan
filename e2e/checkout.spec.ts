import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// None of these tests creates a real order. The ones that talk to the order functions only send things the
// database refuses, and they skip themselves until 0004_orders.sql has been run in Supabase.
const env = (name: string) => readFileSync(".env.local", "utf8").match(new RegExp(`^${name}=(.*)$`, "m"))?.[1].trim() ?? "";

async function ordersDeployed(request: APIRequestContext): Promise<boolean> {
  const res = await request.post(`${env("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/rpc/place_order`, {
    headers: { apikey: env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), "Content-Type": "application/json" },
    data: { p_name: "x", p_phone: "x", p_governorate: "x", p_city: null, p_address: "x", p_landmark: null, p_notes: null, p_items: [] },
  });
  return /INVALID_INPUT|EMPTY_CART/.test(await res.text());
}

const FAKE_PRODUCT = "123e4567-e89b-12d3-a456-426614174000";
const item = {
  key: JSON.stringify([FAKE_PRODUCT, null, null, null]),
  product_id: FAKE_PRODUCT,
  variant_id: null,
  colour_id: null,
  colour_name: null,
  colour_note: null,
  name: "دهان تجريبي",
  size_label: null,
  unit_price: 25000,
  image_url: null,
  quantity: 2,
};
const withCart = async (page: Page) =>
  page.addInitScript((i) => localStorage.setItem("al-erjiwan-cart", JSON.stringify([i])), item);

test("an empty cart sends the visitor to the cart page", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/cart$/);
});

test("the cart page has a working checkout button", async ({ page }) => {
  await withCart(page);
  await page.goto("/cart");
  const button = page.getByRole("link", { name: "إتمام الطلب" });
  await expect(button).toHaveAttribute("href", "/checkout");
  await button.click();
  await expect(page).toHaveURL(/\/checkout$/);
});

test("the checkout lists the cart and sends ids and quantities only, never a price", async ({ page }) => {
  await withCart(page);
  await page.goto("/checkout");
  await expect(page.getByText("دهان تجريبي")).toBeVisible();
  await expect(page.getByText("50,000 د.ع").first()).toBeVisible(); // 2 x 25,000, for display
  const sent = await page.locator('input[name="items"]').inputValue();
  expect(JSON.parse(sent)).toEqual([{ product_id: FAKE_PRODUCT, variant_id: null, colour_id: null, colour_note: null, quantity: 2 }]);
  expect(sent).not.toMatch(/price|total|fee|25000/);
});

test("wrong details show an Arabic error on each field and keep what was typed", async ({ page }) => {
  await withCart(page);
  await page.goto("/checkout");
  await page.getByLabel("الاسم الكامل").fill("ع");
  await page.getByLabel("رقم الهاتف").fill("123");
  await page.getByLabel("العنوان بالتفصيل").fill("شارع الجامعة، قرب المدرسة");
  await page.getByLabel("أقرب نقطة دالة").fill("قرب الجامع");
  await page.getByRole("button", { name: "تأكيد الطلب" }).click();

  await expect(page.getByText("أدخل اسمك الكامل")).toBeVisible();
  await expect(page.getByText("أدخل رقم هاتف عراقي صحيحًا، مثل 07701234567")).toBeVisible();
  await expect(page.getByText("اختر المحافظة", { exact: true }).last()).toBeVisible();
  await expect(page.getByLabel("العنوان بالتفصيل")).toHaveValue("شارع الجامعة، قرب المدرسة");
  await expect(page.getByLabel("أقرب نقطة دالة")).toHaveValue("قرب الجامع");
  await expect(page).toHaveURL(/\/checkout$/);
});

test("there is no example text under the phone box, and the city box is named correctly", async ({ page }) => {
  await withCart(page);
  await page.goto("/checkout");
  await expect(page.getByLabel("رقم الهاتف")).toBeVisible();
  await expect(page.getByText("مثال: 07701234567")).toHaveCount(0);
  await expect(page.getByText("وسنتواصل معك عبر واتساب")).toHaveCount(0);
  await expect(page.getByLabel("المدينة أو القضاء")).toBeVisible();
  await expect(page.getByText("المدينة أو المنطقة")).toHaveCount(0);
});

test("the checkout fits a phone screen", async ({ page }) => {
  await withCart(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/checkout");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.screenshot({ path: "e2e/screenshots/checkout-375.png", fullPage: true });
});

test.describe("with the order functions in the database", () => {
  test.beforeAll(async ({ request }) => {
    test.skip(!(await ordersDeployed(request)), "0004_orders.sql has not been run in Supabase yet");
  });

  test("the province list shows only the province names, never a price or the word free", async ({ page }) => {
    await withCart(page);
    await page.goto("/checkout");
    const names = await page.getByLabel("المحافظة").locator("option").allTextContents();
    expect(names.length).toBeGreaterThan(1);
    for (const name of names.slice(1)) {
      expect(name, name).not.toMatch(/مجانًا|—|د\.ع|\d/);
    }
  });

  test("choosing a governorate shows its fee and adds it to the total", async ({ page }) => {
    await withCart(page);
    await page.goto("/checkout");
    await expect(page.getByText("تظهر بعد اختيار المحافظة")).toBeVisible();

    const select = page.getByLabel("المحافظة");
    const option = select.locator("option[data-fee]").first();
    const fee = Number(await option.getAttribute("data-fee"));
    await select.selectOption({ index: 1 });

    const total = (50000 + fee).toLocaleString("en-US");
    await expect(page.getByTestId("checkout-total")).toContainText(`${total} د.ع`);
  });

  test("an order the database refuses shows a clear Arabic message and keeps the form", async ({ page }) => {
    await withCart(page); // a product that does not exist: the database refuses it, nothing is created
    await page.goto("/checkout");
    await page.getByLabel("الاسم الكامل").fill("علي حسين");
    await page.getByLabel("رقم الهاتف").fill("0770 123 4567");
    await page.getByLabel("المحافظة").selectOption({ index: 1 });
    await page.getByLabel("العنوان بالتفصيل").fill("حي الجامعة، شارع 5");
    await page.getByRole("button", { name: "تأكيد الطلب" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "أحد المنتجات لم يعد متوفرًا" })).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByLabel("الاسم الكامل")).toHaveValue("علي حسين");
    await expect(page.getByLabel("رقم الهاتف")).toHaveValue("0770 123 4567");
  });
});

test("an unknown order code shows a friendly not-found page", async ({ page }) => {
  const response = await page.goto("/order/ZZZZZZZZ");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "الطلب غير موجود" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "تتبع طلبك" })).toBeVisible();
});

test("a code that cannot be real is also just not found", async ({ page }) => {
  for (const code of ["x", "%20", "a".repeat(200)]) {
    const response = await page.goto(`/order/${code}`);
    expect(response?.status(), code).toBe(404);
  }
});

test("tracking asks for the code and phone, and a wrong pair gets a neutral answer", async ({ page }) => {
  await page.goto("/track");
  await expect(page.getByRole("heading", { name: "تتبع طلبك", level: 1 })).toBeVisible();
  await page.getByLabel("رقم الطلب").fill("ZZZZZZZZ");
  await page.getByLabel("رقم الهاتف").fill("07701234567");
  await page.getByRole("button", { name: "عرض حالة الطلب" }).click();
  await expect(page).toHaveURL(/\/track\?/);
  await expect(page.getByText("لم نجد طلبًا بهذه البيانات")).toBeVisible();
});

test("tracking with strange input never shows an error page", async ({ page }) => {
  for (const q of ["code=%27%3B--&phone=1", "code=" + "A".repeat(500) + "&phone=" + "9".repeat(500), "code=&phone="]) {
    const response = await page.goto(`/track?${q}`);
    expect(response?.status(), q).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: "تتبع طلبك", level: 1 })).toBeVisible();
  }
});

test("the footer links to order tracking", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("contentinfo").getByRole("link", { name: "تتبع طلبك" }).click();
  await expect(page).toHaveURL(/\/track$/);
});
