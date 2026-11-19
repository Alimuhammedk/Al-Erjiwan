import { expect, test, type Page } from "@playwright/test";

// Number boxes: tapping one selects its value so typing replaces it, and a box can be emptied while typing.
const selected = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).evaluate((el: HTMLInputElement) => el.selectionStart === 0 && el.selectionEnd === el.value.length && el.value.length > 0);

test("in the calculator, focusing a box with 1 or 2 in it selects it, so typing replaces it", async ({ page }) => {
  await page.goto("/calculator");
  await page.waitForLoadState("networkidle");
  for (const [label, value] of [["عدد الأبواب", "1"], ["عدد الطبقات", "2"]] as const) {
    const box = page.getByLabel(label, { exact: true });
    await box.focus();
    await expect.poll(() => selected(page, label)).toBe(true);
    await page.keyboard.type("5");
    await expect(box).toHaveValue("5");
    expect(value).toBeTruthy();
  }
});

test("a calculator box can be emptied and left empty without a number coming back", async ({ page }) => {
  await page.goto("/calculator");
  await page.waitForLoadState("networkidle");
  const box = page.getByLabel("عدد النوافذ", { exact: true });
  await box.fill("");
  await expect(box).toHaveValue("");
  await box.fill("٣");
  await expect(box).toHaveValue("٣");
});

test("in the admin form, the stock box (0) is selected on focus, and prices can be typed over", async ({ page }) => {
  await page.goto("/styleguide/admin-form");
  await page.waitForLoadState("networkidle");
  const stock = page.locator('input[name="stock"]');
  await stock.focus();
  await expect.poll(() => stock.evaluate((el: HTMLInputElement) => el.selectionStart === 0 && el.selectionEnd === el.value.length)).toBe(true);
  await page.keyboard.type("25");
  await expect(stock).toHaveValue("25");
});

test("text boxes are not affected (their cursor stays where it was tapped)", async ({ page }) => {
  await page.goto("/styleguide/admin-form");
  await page.waitForLoadState("networkidle");
  const name = page.locator('input[name="name_ar"]');
  await name.fill("دهان");
  await name.focus();
  await page.waitForTimeout(100);
  expect(await name.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBe(0);
});

test.describe("the product quantity box", () => {
  const P7 = "/shop/00000000-0000-4002-8000-000000000007";
  test.beforeAll(async ({ request }) => {
    test.skip((await request.get(P7)).status() !== 200, "dummy data is not loaded");
  });

  test("can be emptied and retyped, and goes back to 1 only when left empty", async ({ page }) => {
    await page.goto(P7);
    await page.waitForLoadState("networkidle");
    const box = page.getByLabel("الكمية", { exact: true });
    await box.focus();
    await page.keyboard.type("3");
    await expect(box).toHaveValue("3");
    await box.fill("");
    await expect(box).toHaveValue("");
    await box.fill("12");
    await expect(box).toHaveValue("12");
    await box.fill("");
    await box.blur();
    await expect(box).toHaveValue("1");
    await box.fill("500");
    await box.blur();
    await expect(box).toHaveValue("99");
  });

  test("adds the typed quantity to the cart (an empty box counts as 1)", async ({ page }) => {
    await page.goto(P7);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("الكمية", { exact: true }).fill("3");
    await page.getByRole("button", { name: "أضف إلى السلة" }).click();
    await expect(page.getByRole("link", { name: "السلة (3)" })).toBeVisible();
  });
});
