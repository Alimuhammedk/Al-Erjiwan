import { expect, test, type Page } from "@playwright/test";

// The colour panel on a mixed-paint product. Needs the dummy data (product 1 is a mixed paint); skips itself when it
// isn't loaded. The colour search is answered by the test, so these do not depend on the catalogue.
const P1 = "/shop/00000000-0000-4002-8000-000000000001";

test.beforeAll(async ({ request }) => {
  const r = await request.get(P1);
  test.skip(r.status() !== 200, "dummy data is not loaded");
});

const SHADES = [
  { id: "00000000-0000-4001-8000-0000000000a1", name_ar: "أخضر تجريبي", code: "T-1", hex: "#228b22", family: "الأخضر", system: "T" },
  { id: "00000000-0000-4001-8000-0000000000a2", name_ar: "أزرق تجريبي", code: "T-2", hex: "#1e5aa8", family: "الأزرق", system: "T" },
  { id: "00000000-0000-4001-8000-0000000000a3", name_ar: "أزرق فاتح تجريبي", code: "T-3", hex: "#9ec9f0", family: "الأزرق", system: "T" },
];

async function mockColours(page: Page, requests: URLSearchParams[] = []) {
  await page.route("**/api/colours*", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    requests.push(params);
    const q = params.get("q") ?? "";
    const family = params.get("family");
    const colours = SHADES.filter((c) => (!q || c.name_ar.includes(q) || c.code.includes(q)) && (!family || c.family === family));
    await route.fulfill({ json: { colours, families: ["الأخضر", "الأزرق"] } });
  });
}
const row = (page: Page) => page.getByTestId("colour-row");
const dialog = (page: Page) => page.getByRole("dialog", { name: "اختر اللون" });

test("the product page shows just one slim colour row, not all the colours", async ({ page }) => {
  await mockColours(page);
  await page.goto(P1);
  await expect(row(page)).toContainText("اختر اللون");
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "أخضر تجريبي" })).toHaveCount(0);
});

test("tapping the row opens the panel for this product, with search, family tabs and swatches", async ({ page }) => {
  const asked: URLSearchParams[] = [];
  await mockColours(page, asked);
  await page.goto(P1);
  await row(page).click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole("button", { name: "أخضر تجريبي" })).toBeVisible();
  await expect(dialog(page).getByRole("group", { name: "العائلات" }).getByRole("button", { name: "الأزرق" })).toBeVisible();
  expect(asked[0].get("product")).toBe("00000000-0000-4002-8000-000000000001");
});

test("searching and the family tabs narrow the swatches by asking the server", async ({ page }) => {
  const asked: URLSearchParams[] = [];
  await mockColours(page, asked);
  await page.goto(P1);
  await row(page).click();
  await dialog(page).getByRole("searchbox").fill("فاتح");
  await expect(dialog(page).getByRole("button", { name: "أزرق تجريبي", exact: true })).toHaveCount(0);
  await expect(dialog(page).getByRole("button", { name: "أزرق فاتح تجريبي" })).toBeVisible();
  expect(asked.some((p) => p.get("q") === "فاتح")).toBe(true);
  await dialog(page).getByRole("searchbox").fill("");
  await dialog(page).getByRole("group", { name: "العائلات" }).getByRole("button", { name: "الأخضر" }).click();
  await expect(dialog(page).getByRole("button", { name: "أخضر تجريبي" })).toBeVisible();
  await expect(dialog(page).getByRole("button", { name: "أزرق تجريبي", exact: true })).toHaveCount(0);
  expect(asked.some((p) => p.get("family") === "الأخضر")).toBe(true);
});

test("picking a shade closes the panel and shows its name and code in the row", async ({ page }) => {
  await mockColours(page);
  await page.goto(P1);
  await row(page).click();
  await dialog(page).getByRole("button", { name: "أزرق تجريبي", exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(row(page)).toContainText("أزرق تجريبي");
  await expect(row(page)).toContainText("T T-2");
});

test("Escape and the close button close the panel without choosing", async ({ page }) => {
  await mockColours(page);
  await page.goto(P1);
  await row(page).click();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(row(page)).toContainText("اختر اللون");
  await row(page).click();
  await dialog(page).getByRole("button", { name: "إغلاق" }).click();
  await expect(dialog(page)).toHaveCount(0);
});

test("a picked shade goes into the cart with its name and id", async ({ page }) => {
  await mockColours(page);
  await page.goto(P1);
  await row(page).click();
  await dialog(page).getByRole("button", { name: "أخضر تجريبي" }).click();
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByText("تمت الإضافة إلى السلة")).toBeVisible();
  const cart = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  expect(cart).toContain("أخضر تجريبي");
  expect(cart).toContain("00000000-0000-4001-8000-0000000000a1");
});

test("clearing the shade brings back the requirement to choose or type a colour", async ({ page }) => {
  await mockColours(page);
  await page.goto(P1);
  await row(page).click();
  await dialog(page).getByRole("button", { name: "أخضر تجريبي" }).click();
  await page.getByRole("button", { name: "مسح", exact: true }).click();
  await expect(row(page)).toContainText("اختر اللون");
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByText("اختر لونًا أو اكتب اسمه أو رقمه")).toBeVisible();
});

test("a colour that is not listed can be typed, but the box is hidden until asked for", async ({ page }) => {
  await mockColours(page);
  await page.goto(P1);
  await expect(page.getByLabel("اسم اللون أو رقمه")).toHaveCount(0);
  await page.getByRole("button", { name: "لونك غير موجود؟ اكتب اسمه أو رقمه" }).click();
  await page.getByLabel("اسم اللون أو رقمه").fill("٤٢٠ أخضر زيتي");
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByText("تمت الإضافة إلى السلة")).toBeVisible();
});

test("when the colour search is down, the panel says so and a typed colour still works", async ({ page }) => {
  await page.route("**/api/colours*", (route) => route.fulfill({ status: 500, body: "boom" }));
  await page.goto(P1);
  await row(page).click();
  await expect(dialog(page).getByRole("status")).toContainText("تعذر تحميل الألوان");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "لونك غير موجود؟ اكتب اسمه أو رقمه" }).click();
  await page.getByLabel("اسم اللون أو رقمه").fill("12");
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByText("تمت الإضافة إلى السلة")).toBeVisible();
});

test("an empty answer says nothing matched", async ({ page }) => {
  await mockColours(page);
  await page.goto(P1);
  await row(page).click();
  await dialog(page).getByRole("searchbox").fill("لا يوجد");
  await expect(dialog(page).getByRole("status")).toContainText("لا توجد ألوان مطابقة");
});

for (const [name, width, height] of [["phone", 375, 800], ["desktop", 1280, 800]] as const) {
  test(`the row and the panel fit a ${name} screen`, async ({ page }) => {
    await mockColours(page);
    await page.setViewportSize({ width, height });
    await page.goto(P1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await row(page).click();
    const box = (await dialog(page).boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(width);
    expect(box.height).toBeLessThanOrEqual(height);
    await page.screenshot({ path: `e2e/screenshots/product-colour-panel-${width}.png` });
  });
}
