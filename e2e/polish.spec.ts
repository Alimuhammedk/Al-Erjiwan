import { expect, test, type Page } from "@playwright/test";

// Needs the dummy data (2 active banners, 5 categories, featured products). Skips itself without it.
test.beforeAll(async ({ request }) => {
  const r = await request.get("/shop/00000000-0000-4002-8000-000000000001");
  test.skip(r.status() !== 200, "dummy data is not loaded");
});

// Product of the opacity of an element and all its ancestors: 1 means fully visible.
const visibleOpacity = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    let o = 1;
    for (let n: Element | null = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
    return o;
  });

const dots = (page: Page) => page.getByRole("button", { name: /^الشريحة \d/ });
const current = async (page: Page) =>
  (await dots(page).evaluateAll((els) => els.findIndex((e) => e.getAttribute("aria-current") === "true")));

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the first banner is visible at once", async ({ page }) => {
    await page.goto("/");
    expect(await visibleOpacity(page, "main section img")).toBe(1);
  });

  test("content below the fold shows when scrolled to", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("heading", { name: "الأكثر مبيعًا" }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    expect(await visibleOpacity(page, 'main a[href^="/shop/0000"]')).toBe(1);
  });
});

test("banner dots are at least 44px and the arrows and pause button work", async ({ page }) => {
  await page.goto("/");
  await expect(dots(page)).toHaveCount(2);
  for (const box of await Promise.all((await dots(page).all()).map((d) => d.boundingBox()))) {
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  const start = await current(page);
  await page.getByRole("button", { name: "الشريحة التالية" }).click();
  await expect.poll(() => current(page)).not.toBe(start);
  await page.getByRole("button", { name: "الشريحة السابقة" }).click();
  await expect.poll(() => current(page)).toBe(start);

  await page.getByRole("button", { name: "إيقاف التشغيل التلقائي" }).click();
  await expect(page.getByRole("button", { name: "تشغيل التلقائي" })).toBeVisible();
});

test("the banner rotates on its own, but not when reduced motion is requested", async ({ page, browser }) => {
  await page.goto("/");
  const first = await current(page);
  await expect.poll(() => current(page), { timeout: 8000 }).not.toBe(first);

  const calm = await browser.newContext({ reducedMotion: "reduce" });
  const still = await calm.newPage();
  await still.goto("http://localhost:3000/");
  const before = await current(still);
  await still.waitForTimeout(6500);
  expect(await current(still)).toBe(before);
  await calm.close();
});

test("categories are links and the last row is centred", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const cards = page.locator('main a[href^="/shop?category="]');
  await expect(cards).toHaveCount(5);

  const boxes = await Promise.all((await cards.all()).map((c) => c.boundingBox()));
  const bottom = Math.max(...boxes.map((b) => b!.y));
  const lastRow = boxes.filter((b) => Math.abs(b!.y - bottom) < 4);
  const left = Math.min(...boxes.map((b) => b!.x));
  const right = Math.max(...boxes.map((b) => b!.x + b!.width));
  const rowLeft = Math.min(...lastRow.map((b) => b!.x));
  const rowRight = Math.max(...lastRow.map((b) => b!.x + b!.width));
  expect(Math.abs((rowLeft + rowRight) / 2 - (left + right) / 2)).toBeLessThan(6);

  await cards.first().click();
  await expect(page).toHaveURL(/\/shop\?category=/);
});

test("a skip link is the first Tab stop and jumps to the content", async ({ page }) => {
  await page.goto("/shop");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "تخطي إلى المحتوى" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("main-content");
});

test("the top bar marks the page you are on", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "القائمة" });
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const [path, label] of [["/", "الرئيسية"], ["/shop", "المتجر"], ["/calculator", "حاسبة الدهان"]]) {
    await page.goto(path);
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
  }
});

test("the phone menu marks the page you are on", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/shop");
  await page.getByRole("button", { name: "القائمة" }).click();
  await expect(page.locator("#mobile-menu").getByRole("link", { name: "المتجر" })).toHaveAttribute("aria-current", "page");
});

test("a product page has breadcrumbs back to the shop", async ({ page }) => {
  await page.goto("/shop/00000000-0000-4002-8000-000000000001");
  const crumbs = page.getByRole("navigation", { name: "مسار التنقل" });
  await expect(crumbs.getByRole("link", { name: "الرئيسية" })).toHaveAttribute("href", "/");
  await expect(crumbs.getByRole("link", { name: "المتجر" })).toHaveAttribute("href", "/shop");
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText("بنتلايت داخلي ممتاز");
});

test("homepage product sections have a view-all link to the shop", async ({ page }) => {
  await page.goto("/");
  for (const heading of ["الأكثر مبيعًا", "العروض"]) {
    const section = page.locator("section", { has: page.getByRole("heading", { name: heading }) });
    await expect(section.getByRole("link", { name: "عرض الكل" })).toHaveAttribute("href", "/shop");
  }
});

const P = (n: number) => `00000000-0000-4002-8000-${String(n).padStart(12, "0")}`;

test("a sale shows a discount badge on the card and on the product page", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.locator('main a[href^="/shop/0000"]', { hasText: "ورق جدران ملكي" })).toContainText("خصم 16%");
  await expect(page.locator('main a[href^="/shop/0000"]', { hasText: "فرشاة طلاء" })).not.toContainText("خصم");
  await page.goto(`/shop/${P(6)}`);
  await expect(page.getByText("خصم 16%")).toBeVisible();
});

test("the product page reassures with delivery, cash on delivery and support", async ({ page }) => {
  await page.goto(`/shop/${P(7)}`);
  for (const text of ["توصيل إلى جميع محافظات العراق", "الدفع عند الاستلام", "دعم عبر واتساب"]) {
    await expect(page.getByText(text).first()).toBeVisible();
  }
});

test("a pop-up confirms an add to cart and links to the cart, and the badge bumps", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/shop/${P(7)}`);
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  const toast = page.getByRole("status").filter({ hasText: "تمت الإضافة إلى السلة" });
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("فرشاة طلاء احترافية");
  await expect(page.getByTestId("cart-badge")).toHaveClass(/bump/);
  await toast.getByRole("link", { name: "عرض السلة" }).click();
  await expect(page).toHaveURL(/\/cart$/);
});

test("on a phone a sticky bar keeps price and add button in reach, and not on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto(`/shop/${P(7)}`);
  const bar = page.getByTestId("sticky-buy");
  await expect(bar).toBeVisible();
  await expect(bar).toContainText("8,000 د.ع");
  const box = await bar.boundingBox();
  expect(box!.y + box!.height).toBeGreaterThanOrEqual(695);
  await bar.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByRole("link", { name: "السلة (1)" })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(bar).toBeHidden();
});

test("the sticky bar button is disabled for a sold-out product", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto(`/shop/${P(8)}`);
  await expect(page.getByTestId("sticky-buy").getByRole("button")).toBeDisabled();
});

test("a card with two photos shows the second on hover and lifts", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/shop");
  const two = page.locator('main a[href^="/shop/0000"]', { hasText: "بنتلايت داخلي ممتاز" });
  const one = page.locator('main a[href^="/shop/0000"]', { hasText: "فرشاة طلاء" });
  await expect(two.locator("img")).toHaveCount(2);
  await expect(one.locator("img")).toHaveCount(1);

  const second = two.locator("img").nth(1);
  const opacity = () => second.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
  expect(await opacity()).toBe(0);
  await two.hover();
  await expect.poll(opacity).toBe(1);
  // Tailwind v4 lifts with the `translate` property, not `transform`.
  await expect.poll(() => two.evaluate((el) => getComputedStyle(el).translate)).toMatch(/-\d/);
});
