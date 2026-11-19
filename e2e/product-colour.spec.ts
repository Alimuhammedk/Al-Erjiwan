import { expect, test, type Page } from "@playwright/test";

// The catalogue colour picker on a mixed-paint product. Needs the dummy data (product 1 is a mixed paint); skips
// itself when it isn't loaded. The colour search is answered by the test, so these do not depend on the catalogue.
const P1 = "/shop/00000000-0000-4002-8000-000000000001";
const C3 = "00000000-0000-4001-8000-000000000003";

test.beforeAll(async ({ request }) => {
  const r = await request.get(P1);
  test.skip(r.status() !== 200, "dummy data is not loaded");
});

const SHADES = [
  { id: "00000000-0000-4001-8000-0000000000a1", name_ar: "أخضر تجريبي", code: "T-1", hex: "#228b22", family: "الأخضر", system: "T" },
  { id: "00000000-0000-4001-8000-0000000000a2", name_ar: "أزرق تجريبي", code: "T-2", hex: "#1e5aa8", family: "الأزرق", system: "T" },
];

async function mockColours(page: Page, requests: string[] = []) {
  await page.route("**/api/colours*", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.searchParams.get("q") ?? "");
    const q = url.searchParams.get("q") ?? "";
    await route.fulfill({ json: { colours: SHADES.filter((c) => !q || c.name_ar.includes(q) || c.code.includes(q)) } });
  });
}

test("searching asks the server as you type, and picking a shade shows its name and code", async ({ page }) => {
  const asked: string[] = [];
  await mockColours(page, asked);
  await page.goto(P1);
  const finder = page.getByTestId("colour-finder");
  await expect(finder.getByRole("button", { name: "أخضر تجريبي" })).toBeVisible();
  await finder.getByRole("searchbox").fill("أزرق");
  await expect(finder.getByRole("button", { name: "أخضر تجريبي" })).toHaveCount(0);
  await finder.getByRole("button", { name: "أزرق تجريبي" }).click();
  const chosen = page.getByTestId("chosen-colour");
  await expect(chosen).toContainText("أزرق تجريبي");
  await expect(chosen).toContainText("T T-2");
  expect(asked).toContain("أزرق");
});

test("a picked shade goes into the cart with its name", async ({ page }) => {
  await mockColours(page);
  await page.goto(P1);
  await page.getByRole("button", { name: "أخضر تجريبي" }).click();
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByText("تمت الإضافة إلى السلة")).toBeVisible();
  const cart = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  expect(cart).toContain("أخضر تجريبي");
  expect(cart).toContain("00000000-0000-4001-8000-0000000000a1");
});

test("clearing the shade brings back the requirement to choose or type a colour", async ({ page }) => {
  await mockColours(page);
  await page.goto(P1);
  await page.getByRole("button", { name: "أخضر تجريبي" }).click();
  await page.getByRole("button", { name: "مسح اللون" }).click();
  await expect(page.getByTestId("chosen-colour")).toHaveCount(0);
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByText("اختر لونًا أو اكتب اسمه أو رقمه")).toBeVisible();
});

test("a colour that is not listed can still be typed and ordered", async ({ page }) => {
  await mockColours(page);
  await page.goto(P1);
  await page.getByLabel("لونك غير موجود؟ اكتب اسم اللون أو رقمه").fill("٤٢٠ أخضر زيتي");
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByText("تمت الإضافة إلى السلة")).toBeVisible();
});

test("when the colour search is down, the page says so and the typed colour still works", async ({ page }) => {
  await page.route("**/api/colours*", (route) => route.fulfill({ status: 500, body: "boom" }));
  await page.goto(P1);
  await expect(page.getByTestId("colour-finder").getByRole("status")).toContainText("تعذر تحميل الألوان");
  await page.getByLabel("لونك غير موجود؟ اكتب اسم اللون أو رقمه").fill("12");
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByText("تمت الإضافة إلى السلة")).toBeVisible();
});

test("an empty answer says nothing matched", async ({ page }) => {
  await mockColours(page);
  await page.goto(P1);
  await page.getByTestId("colour-finder").getByRole("searchbox").fill("لا يوجد");
  await expect(page.getByTestId("colour-finder").getByRole("status")).toContainText("لا توجد درجات مطابقة");
});

test("arriving from the colour page with ?colour= starts with that shade chosen", async ({ page, request }) => {
  // needs 0006_colours.sql run in Supabase and colours loaded (the real catalogue answers the search)
  const real = await request.get("/api/colours");
  test.skip(((await real.json()) as { colours: unknown[] }).colours.length === 0, "the colour catalogue (0006) is not loaded yet");
  await mockColours(page);
  await page.goto(`${P1}?colour=${C3}`);
  await expect(page.getByTestId("chosen-colour")).toBeVisible();
  await page.goto(`${P1}?colour=not-a-uuid`);
  await expect(page.getByTestId("chosen-colour")).toHaveCount(0);
});

test("the product page with the picker fits a phone screen", async ({ page }) => {
  await mockColours(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(P1);
  await expect(page.getByTestId("colour-finder")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.screenshot({ path: "e2e/screenshots/product-colour-375.png", fullPage: true });
});
