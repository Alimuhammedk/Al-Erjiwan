import { expect, test, type Locator, type Page } from "@playwright/test";

// Every row on the homepage slides sideways in ONE line: its items never wrap onto a second line and never sit on
// top of each other. Tried on the real homepage (it uses whatever categories and products exist).
const scrollers = (page: Page) => page.getByTestId("side-scroller");
const items = (scroller: Locator) => scroller.locator("ul > li");

async function boxes(scroller: Locator) {
  return Promise.all((await items(scroller).all()).map((i) => i.boundingBox()));
}

for (const [name, width] of [["phone", 375], ["tablet", 768], ["desktop", 1280]] as const) {
  test(`on a ${name}, every row keeps its items in one line without overlapping`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const count = await scrollers(page).count();
    expect(count).toBeGreaterThanOrEqual(2); // at least categories and the reassurance boxes
    for (let s = 0; s < count; s++) {
      const list = (await boxes(scrollers(page).nth(s))).filter((b): b is NonNullable<typeof b> => b !== null);
      if (list.length < 2) continue;
      const top = list[0].y;
      for (const b of list) expect(Math.abs(b.y - top), `row ${s} wraps at ${width}px`).toBeLessThan(40); // one line (cards may differ a little in height)
      const sorted = [...list].sort((p, q) => p.x - q.x);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].x, `row ${s} items overlap at ${width}px`).toBeGreaterThanOrEqual(sorted[i - 1].x + sorted[i - 1].width - 1);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
}

test("the categories row slides: swiping or the arrows move it, and the arrows only show when there is more to see", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const row = page.getByRole("list", { name: "تسوّق حسب الفئة" });
  const itemCount = await row.locator("> li").count();
  test.skip(itemCount < 5, "needs 5 or more categories to overflow on a desktop");

  const container = row.locator("xpath=..");
  const scrolled = () => row.evaluate((el) => Math.abs(el.scrollLeft));
  await expect(container.getByRole("button", { name: "السابق" })).toHaveCount(0);
  await expect(container.getByRole("button", { name: "التالي" })).toBeVisible();

  await container.getByRole("button", { name: "التالي" }).click();
  await expect.poll(scrolled).toBeGreaterThan(50);
  await expect(container.getByRole("button", { name: "السابق" })).toBeVisible();

  await container.getByRole("button", { name: "السابق" }).click();
  await expect.poll(scrolled).toBeLessThan(5);
  await expect(container.getByRole("button", { name: "السابق" })).toHaveCount(0);
});

test("on a phone the rows scroll sideways by touch (the page itself does not)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const row = page.getByRole("list", { name: "تسوّق حسب الفئة" });
  const overflow = await row.evaluate((el) => ({ scrollable: el.scrollWidth > el.clientWidth, snap: getComputedStyle(el).scrollSnapType, x: getComputedStyle(el).overflowX }));
  expect(overflow.x).toBe("auto");
  expect(overflow.snap).toContain("x");
  expect(overflow.scrollable).toBe(true);
  await row.evaluate((el) => el.scrollBy({ left: -200 })); // forward in a right-to-left page
  expect(await row.evaluate((el) => Math.abs(el.scrollLeft))).toBeGreaterThan(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test("the three reassurance boxes slide on a phone and share the row on a desktop", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const phone = page.getByRole("list", { name: "لماذا نحن" });
  expect(await phone.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 800 });
  const desktop = page.getByRole("list", { name: "لماذا نحن" });
  expect(await desktop.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await expect(page.getByTestId("side-scroller").last().getByRole("button")).toHaveCount(0);
});

test("the articles row, when there are articles, also stays in one line", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/styleguide/articles");
  await page.waitForLoadState("networkidle");
  const cards = page.getByTestId("article-card");
  const list = (await Promise.all((await cards.all()).map((c) => c.boundingBox()))).filter((b): b is NonNullable<typeof b> => b !== null);
  for (const b of list) expect(Math.abs(b.y - list[0].y)).toBeLessThan(2);
});
