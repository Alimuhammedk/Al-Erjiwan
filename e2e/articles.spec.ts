import { expect, test, type Page } from "@playwright/test";

// The homepage articles section and the article page, tried on dev-only copies with sample articles; and the
// admin article form (real checks, nothing saved). The real homepage must also keep working with no articles.
const URL = "/styleguide/articles";
const cards = (page: Page) => page.getByTestId("article-card");
const track = (page: Page) => page.getByRole("list", { name: "مقالات" });
const scrolled = (page: Page) => track(page).evaluate((el) => Math.abs(el.scrollLeft));

test("shows 'مقالات' with one card at a time: cover, date, title, excerpt and a read link", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("heading", { name: "مقالات", level: 2 })).toBeVisible();
  await expect(cards(page)).toHaveCount(4);
  const first = cards(page).first();
  await expect(first.getByRole("heading")).toHaveCount(0); // the title is the link text, not a heading inside the card
  await expect(first).toContainText("كيف تختار لون غرفة المعيشة بثقة");
  await expect(first).toContainText("ثلاث خطوات بسيطة");
  await expect(first).toContainText("اقرأ المقال");
  await expect(first.locator("time")).toBeVisible();
  await expect(first.locator("img")).toBeVisible();
  await expect(first.getByRole("link")).toHaveAttribute("href", /^\/articles\/123e4567/);
});

test("a card without a written excerpt shows the start of its text", async ({ page }) => {
  await page.goto(URL);
  await expect(cards(page).nth(1)).toContainText("المطفي يخفي عيوب الجدار");
});

test("only one card is mostly in view; the arrows and dots move one card at a time", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(URL);
  await page.waitForLoadState("networkidle");
  const width = (await cards(page).first().boundingBox())!.width;
  expect(width).toBeGreaterThan(375 * 0.75); // one card fills most of the phone screen, the next only peeks in
  await expect(page.getByRole("button", { name: "المقال السابق" })).toBeDisabled();

  await page.getByRole("button", { name: "المقال التالي" }).click();
  await expect.poll(() => scrolled(page)).toBeGreaterThan(width * 0.8);
  await expect(page.getByRole("button", { name: "اذهب إلى المقال 2" })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("button", { name: "المقال السابق" })).toBeEnabled();

  await page.getByRole("button", { name: "اذهب إلى المقال 4" }).click();
  await expect(page.getByRole("button", { name: "اذهب إلى المقال 4" })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("button", { name: "المقال التالي" })).toBeDisabled();

  await page.getByRole("button", { name: "المقال السابق" }).click();
  await expect(page.getByRole("button", { name: "اذهب إلى المقال 3" })).toHaveAttribute("aria-current", "true");
});

test("the controls are easy to tap", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(URL);
  for (const name of ["المقال السابق", "المقال التالي"]) {
    const box = (await page.getByRole("button", { name }).boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  for (const b of await page.getByRole("button", { name: /اذهب إلى المقال/ }).all()) {
    const box = (await b.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
  }
});

test("a single article has no arrows or dots, and no articles means the whole section is gone", async ({ page }) => {
  await page.goto(`${URL}?one=1`);
  await expect(cards(page)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "المقال التالي" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /اذهب إلى المقال/ })).toHaveCount(0);
  await page.goto(`${URL}?empty=1`);
  await expect(page.getByTestId("articles")).toHaveCount(0);
  await expect(page.getByText("مقالات")).toHaveCount(0);
});

test("clicking a card opens the article: title, date, paragraphs, pictures and the way back", async ({ page }) => {
  await page.goto(`${URL}?view=article`);
  const view = page.getByTestId("article-view");
  await expect(view.getByRole("heading", { name: "كيف تختار لون غرفة المعيشة بثقة", level: 1 })).toBeVisible();
  await expect(view.locator("time")).toBeVisible();
  await expect(view.locator("p").filter({ hasText: "الألوان الفاتحة تجعل الغرفة أوسع." })).toBeVisible();
  await expect(view.locator("p").filter({ hasText: "جرّب العينة على الجدار" })).toBeVisible();
  await expect(view.locator("img")).toHaveCount(3); // the cover and 2 extra pictures
  await expect(view.getByRole("link", { name: "تسوّق الآن" })).toHaveAttribute("href", "/shop");
  await expect(view.getByRole("link", { name: "العودة إلى الرئيسية" }).first()).toHaveAttribute("href", "/");
});

test("an unknown or malformed article address shows a friendly not-found page", async ({ page }) => {
  for (const id of ["not-a-uuid", "123e4567-e89b-12d3-a456-426614174999"]) {
    const res = await page.goto(`/articles/${id}`);
    expect(res?.status(), id).toBe(404);
    await expect(page.getByRole("heading", { name: "المقال غير موجود" })).toBeVisible();
  }
});

test("the real homepage works with or without articles, and the articles come right above the calculator banner", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page.getByTestId("calculator-banner")).toBeVisible();
  if ((await page.getByTestId("articles").count()) > 0) {
    const a = (await page.getByTestId("articles").boundingBox())!;
    const c = (await page.getByTestId("calculator-banner").boundingBox())!;
    expect(a.y + a.height).toBeLessThanOrEqual(c.y);
    const offers = (await page.getByRole("heading", { name: "العروض" }).boundingBox())!;
    expect(offers.y).toBeLessThan(a.y);
  }
});

for (const [name, width] of [["phone", 375], ["tablet", 768], ["desktop", 1280]] as const) {
  test(`the articles section and the article page fit a ${name} screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(URL);
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.screenshot({ path: `e2e/screenshots/articles-${width}.png` });
    await page.goto(`${URL}?view=article`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.screenshot({ path: `e2e/screenshots/article-page-${width}.png`, fullPage: true });
  });
}

test.describe("the admin article form", () => {
  const ADMIN = "/styleguide/admin-article";

  test("asks for a title and a cover picture, and keeps what was typed", async ({ page }) => {
    await page.goto(ADMIN);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("نص المقال", { exact: false }).fill("فقرة أولى\n\nفقرة ثانية");
    await page.getByRole("button", { name: "حفظ", exact: true }).click();
    await expect(page.getByText("هذا الحقل مطلوب").first()).toBeVisible();
    await expect(page.getByLabel("نص المقال", { exact: false })).toHaveValue("فقرة أولى\n\nفقرة ثانية");
  });

  test("has the cover, the extra pictures, the summary hint and the published switch", async ({ page }) => {
    await page.goto(ADMIN);
    for (const text of ["عنوان المقال", "الصورة الرئيسية", "ملخص قصير", "نص المقال", "صور إضافية (حتى 6", "منشور في الصفحة الرئيسية"]) {
      await expect(page.getByText(text).first()).toBeVisible();
    }
    await expect(page.getByText("إذا تركته فارغًا نأخذ بداية النص تلقائيًا.")).toBeVisible();
    await expect(page.getByLabel("منشور في الصفحة الرئيسية")).toBeChecked();
  });

  test("fits a phone screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(ADMIN);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.screenshot({ path: "e2e/screenshots/admin-article-375.png", fullPage: true });
  });
});
