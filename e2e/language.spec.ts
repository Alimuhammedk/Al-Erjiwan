import { expect, test, type Page } from "@playwright/test";

// The Arabic / English switch: direction, words, memory, the cart, the admin staying Arabic, and the English layout.
const ARABIC = /[؀-ۿ]/;

async function useEnglish(page: Page) {
  await page.context().addCookies([{ name: "lang", value: "en", url: "http://localhost:3000" }]);
}
const visible = (page: Page, selector: string) => page.locator(selector).first().innerText();

test("the site is Arabic and right to left by default, and the switch offers English", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator('[data-testid="language-switch"]:visible')).toHaveText("English");
});

test("tapping the switch makes the whole page English and left to right, and it is remembered", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.locator('[data-testid="language-switch"]:visible').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  const nav = page.getByRole("navigation", { name: "Menu" });
  await expect(nav.getByRole("link")).toHaveText(["Home", "Shop", "Paint calculator", "Track order"]);
  await expect(page.locator('[data-testid="language-switch"]:visible')).toHaveText("عربي");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Shop", level: 1 })).toBeVisible();

  await page.locator('[data-testid="language-switch"]:visible').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "المتجر", level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/shop$/); // the page was kept
});

test("the switch is in the phone menu", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "القائمة" }).click();
  await page.locator('[data-testid="language-switch"]:visible').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const sw = page.locator('[data-testid="language-switch"]:visible');
  if (!(await sw.count())) await page.getByRole("button", { name: "Menu" }).click(); // the menu may have stayed open
  await expect(sw).toHaveText("عربي");
});

test("an unknown language cookie means Arabic", async ({ page }) => {
  await page.context().addCookies([{ name: "lang", value: "klingon", url: "http://localhost:3000" }]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
});

test("the cart is kept when the language changes", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const item = { key: "k1", product_id: "123e4567-e89b-12d3-a456-426614174000", variant_id: null, colour_id: null, colour_name: null, colour_note: null, name: "دهان تجريبي", size_label: null, unit_price: 25000, image_url: null, quantity: 2 };
    localStorage.setItem("al-erjiwan-cart", JSON.stringify([item]));
  });
  const key = await page.evaluate(() => Object.keys(localStorage).find((k) => localStorage.getItem(k)?.includes("دهان تجريبي")) ?? "");
  expect(key).not.toBe("");
  await page.reload();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('[data-testid="language-switch"]:visible').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "Cart (2)" })).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByText("50,000 IQD").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cart", level: 1 })).toBeVisible();
});

test("the admin stays Arabic and right to left even when the shop is in English", async ({ page }) => {
  await useEnglish(page);
  await page.goto("/admin/login");
  await expect(page.locator("#main-content")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("#main-content")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("heading", { name: "تسجيل دخول المدير" })).toBeVisible();
});

test("English pages have no Arabic words in their own text (names and content that you write excepted)", async ({ page }) => {
  await useEnglish(page);
  for (const path of ["/track", "/calculator", "/cart"]) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const text = (await visible(page, "header")) + (await visible(page, "main")) + (await visible(page, "footer"));
    const hit = text.replace("عربي", "").split("\n").filter((l) => ARABIC.test(l));
    expect(hit, `Arabic on ${path}`).toEqual([]);
  }
});

test("the English checkout form and its errors are in English", async ({ page }) => {
  await useEnglish(page);
  await page.goto("/");
  await page.evaluate(() => {
    const item = { key: "k1", product_id: "123e4567-e89b-12d3-a456-426614174000", variant_id: null, colour_id: null, colour_name: null, colour_note: null, name: "Test paint", size_label: null, unit_price: 25000, image_url: null, quantity: 1 };
    localStorage.setItem("al-erjiwan-cart", JSON.stringify([item]));
  });
  await page.goto("/checkout");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Checkout", level: 1 })).toBeVisible();
  for (const label of ["Full name", "Phone number", "Governorate", "City or district", "Nearest landmark"]) {
    await expect(page.getByLabel(label)).toBeVisible();
  }
  await page.getByRole("button", { name: "Confirm the order" }).click();
  await expect(page.getByText("Enter your full name")).toBeVisible();
  await expect(page.getByText("Enter a valid Iraqi phone number, like 07701234567")).toBeVisible();
  await expect(page.getByText("Enter the city or district")).toBeVisible();
  const form = await page.locator("form").first().innerText();
  expect(form.split("\n").filter((l) => ARABIC.test(l))).toEqual([]);
});

test("tracking an unknown order says so in English", async ({ page }) => {
  await useEnglish(page);
  await page.goto("/track?code=ZZZZZZZZ&phone=07701234567");
  await expect(page.getByText("We could not find an order with these details")).toBeVisible();
});

for (const [name, width] of [["phone", 375], ["tablet", 768], ["desktop", 1280]] as const) {
  test(`the English pages fit a ${name} screen and nothing overlaps`, async ({ page }) => {
    await useEnglish(page);
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/shop", "/cart", "/track", "/calculator"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), `${path} at ${width}px`).toBe(false);
    }
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `e2e/screenshots/english-home-${width}.png`, fullPage: true });
  });
}

test("in English the rows start at the left and slide the other way", async ({ page }) => {
  await useEnglish(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const row = page.getByRole("list", { name: "Shop by category" });
  const first = (await row.locator("> li").first().boundingBox())!;
  expect(first.x).toBeLessThan(40); // the first card is at the left edge
  await row.evaluate((el) => el.scrollBy({ left: 200 }));
  expect(await row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100); // forward is to the right
});
