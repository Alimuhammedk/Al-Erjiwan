import { expect, test } from "@playwright/test";

// The customer colour page, tried on a dev-only copy with sample shades (same page, searched in memory).
const URL = "/styleguide/colours";

test("shows the shades with name and code, and the top bar has the colour link before calculator and tracking", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("heading", { name: "منتقي الألوان", level: 1 })).toBeVisible();
  await expect(page.getByTestId("colour-swatch")).toHaveCount(10);
  await expect(page.getByTestId("colour-swatch").first()).toContainText("JW");
  const links = await page.getByRole("banner").getByRole("link").allTextContents();
  const names = links.map((l) => l.trim()).filter(Boolean);
  expect(names.indexOf("منتقي الألوان")).toBeGreaterThan(-1);
  expect(names.indexOf("منتقي الألوان")).toBeLessThan(names.indexOf("حاسبة الدهان"));
  expect(names.at(-1)).toBe("تتبع الطلب");
});

test("search narrows by name or code, and says when nothing matches", async ({ page }) => {
  await page.goto(URL);
  await page.getByRole("main").getByRole("searchbox").fill("أزرق");
  await page.getByRole("main").getByRole("button", { name: "بحث" }).click();
  await expect(page.getByTestId("colour-swatch")).toHaveCount(2);
  await page.getByRole("main").getByRole("searchbox").fill("jw-40");
  await page.getByRole("main").getByRole("button", { name: "بحث" }).click();
  await expect(page.getByTestId("colour-swatch")).toHaveCount(2);
  await page.getByRole("main").getByRole("searchbox").fill("لا يوجد");
  await page.getByRole("main").getByRole("button", { name: "بحث" }).click();
  await expect(page.getByText("لا توجد درجات مطابقة")).toBeVisible();
});

test("family chips filter the shades", async ({ page }) => {
  await page.goto(URL);
  await page.getByRole("navigation", { name: "العائلات" }).getByRole("link", { name: "الأخضر" }).click();
  await expect(page).toHaveURL(/family=/);
  await expect(page.getByTestId("colour-swatch")).toHaveCount(2);
  await expect(page.getByRole("navigation", { name: "العائلات" }).getByRole("link", { name: "الأخضر" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("navigation", { name: "العائلات" }).getByRole("link", { name: "الكل" }).click();
  await expect(page.getByTestId("colour-swatch")).toHaveCount(10);
});

test("the wheel works from the keyboard and lists the closest shades", async ({ page }) => {
  await page.goto(URL);
  await page.waitForLoadState("networkidle");
  const wheel = page.getByTestId("colour-wheel");
  await wheel.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/hex=%23[0-9a-f]{6}/);
  const closest = page.getByTestId("closest").getByTestId("colour-swatch");
  await expect(closest).toHaveCount(8);
  await expect(page.getByTestId("selected-colour")).toBeVisible();
  const before = await page.getByTestId("selected-colour").getAttribute("data-hex");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(page.getByTestId("selected-colour")).not.toHaveAttribute("data-hex", before!);
});

test("clicking the wheel picks a colour near where it was clicked", async ({ page }) => {
  await page.goto(URL);
  await page.waitForLoadState("networkidle");
  const box = (await page.getByTestId("colour-wheel").boundingBox())!;
  // far right of the wheel is a bluish-green-ish hue at full strength; far top is red; just check it picks something strong
  await page.mouse.click(box.x + box.width / 2, box.y + 8);
  await expect(page).toHaveURL(/hex=%23[0-9a-f]{6}/);
  const hex = (await page.getByTestId("selected-colour").getAttribute("data-hex"))!;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  expect(r).toBeGreaterThan(g);
  expect(r).toBeGreaterThan(b); // the top of the wheel is red
});

test("choosing a shade repaints all four rooms, shows the honest note, the code and matching products", async ({ page }) => {
  await page.goto(URL);
  await page.getByRole("link", { name: "اختر اللون أزرق سماوي" }).click();
  const panel = page.getByTestId("selected-colour");
  await expect(panel).toHaveAttribute("data-hex", "#bfe0f2");
  await expect(panel).toContainText("أزرق سماوي");
  await expect(panel).toContainText("JW JW-301");
  await expect(page.getByRole("note")).toContainText("ألوان الشاشة تختلف");
  for (const room of ["غرفة المعيشة", "غرفة النوم", "المطبخ", "الواجهة"]) {
    await page.getByRole("tab", { name: room }).click();
    await expect(page.getByTestId("room-svg")).toHaveAttribute("data-wall", "#bfe0f2");
    await expect(page.getByRole("tab", { name: room })).toHaveAttribute("aria-selected", "true");
  }
  await expect(panel.getByRole("link", { name: /بنتلايت داخلي ممتاز/ })).toHaveAttribute("href", /\/shop\/p1\?colour=/);
  await expect(panel.getByRole("link", { name: /دهان مخلوط/ })).toBeVisible();
  await page.getByRole("link", { name: "اختر اللون أزرق ملكي" }).click();
  await expect(page.getByTestId("room-svg")).toHaveAttribute("data-wall", "#2f4b9a");
});

test("clearing the choice removes the panel", async ({ page }) => {
  await page.goto(`${URL}?hex=%23ff0000`);
  await expect(page.getByTestId("selected-colour")).toBeVisible();
  await page.getByRole("link", { name: "مسح الاختيار" }).click();
  await expect(page.getByTestId("selected-colour")).toHaveCount(0);
});

test("an empty catalogue shows a friendly message instead of broken blocks", async ({ page }) => {
  await page.goto(`${URL}?empty=1`);
  await expect(page.getByText("لم تُضف الألوان بعد")).toBeVisible();
  await expect(page.getByTestId("colour-wheel")).toHaveCount(0);
});

test("weird addresses never show an error page", async ({ page }) => {
  for (const q of ["?hex=zzz", "?q=%25%2C%28%29", "?page=-4", "?c=not-a-uuid", "?family=" + "ا".repeat(100)]) {
    const res = await page.goto(`${URL}${q}`);
    expect(res?.status(), q).toBe(200);
    await expect(page.getByRole("heading", { name: "منتقي الألوان", level: 1 })).toBeVisible();
  }
});

for (const [name, width] of [["phone", 375], ["tablet", 768], ["desktop", 1280]] as const) {
  test(`the colour page fits a ${name} screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${URL}?c=123e4567-e89b-12d3-a456-426614174005`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    for (const box of await Promise.all((await page.locator("main a, main button").all()).map((b) => b.boundingBox()))) {
      if (box) expect(box.height, `tap height at ${width}px`).toBeGreaterThanOrEqual(40);
    }
    await page.screenshot({ path: `e2e/screenshots/colours-${width}.png`, fullPage: true });
  });
}

test("the real colour page answers even before any colours exist", async ({ page }) => {
  const res = await page.goto("/colours");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "منتقي الألوان", level: 1 })).toBeVisible();
});
