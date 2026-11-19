import { expect, test, type Page } from "@playwright/test";

// The admin product form, tried on the dev-only copy (it runs the real form and the real validation,
// but only shows what would be saved).
const URL = "/styleguide/admin-form";
const C = (n: number) => `00000000-0000-4003-8000-${String(n).padStart(12, "0")}`;

const saveButton = (page: Page) => page.getByRole("button", { name: "حفظ المنتج" });
const sizeBoxes = (page: Page, label: string) => page.getByLabel(label, { exact: true });

async function saved(page: Page) {
  await saveButton(page).click();
  const text = await page.getByRole("alert").filter({ hasText: "ECHO:" }).textContent();
  return JSON.parse(text!.replace("ECHO:", ""));
}

async function fillSize(page: Page, i: number, label: string, price: string, stock: string) {
  await sizeBoxes(page, "الحجم").nth(i).fill(label);
  await sizeBoxes(page, "السعر (د.ع)").nth(i).fill(price);
  await sizeBoxes(page, "الكمية").nth(i).fill(stock);
}

const sizesSwitch = (page: Page) => page.getByLabel(/هذا المنتج له أحجام مختلفة/);
const name = (page: Page) => page.locator('input[name="name_ar"]');
const picker = (page: Page, n: number) => page.getByRole("button", { name: `اللون (اختياري) ${n}` });

test("there is exactly one save button, with or without sizes", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("button", { name: /حفظ/ })).toHaveCount(1);
  await sizesSwitch(page).check();
  await expect(page.getByRole("button", { name: /حفظ/ })).toHaveCount(1);
});

test("one price field for a plain product, and none at the top once there are sizes", async ({ page }) => {
  await page.goto(URL);
  for (const field of ["base_price", "sale_price", "stock"]) await expect(page.locator(`input[name="${field}"]`)).toBeVisible();
  await sizesSwitch(page).check();
  for (const field of ["base_price", "sale_price", "stock"]) await expect(page.locator(`input[name="${field}"]`)).toHaveCount(0);
  await expect(page.getByText("السعر والكمية يُحدَّدان لكل حجم")).toBeVisible();
  await expect(sizeBoxes(page, "السعر (د.ع)")).toHaveCount(1);
});

test("a plain product saves its single price, sale price and stock in one go", async ({ page }) => {
  await page.goto(URL);
  await name(page).fill("دهان أبيض");
  await page.locator('input[name="base_price"]').fill("٢٥٬٠٠٠");
  await page.locator('input[name="sale_price"]').fill("20000");
  await page.locator('input[name="stock"]').fill("10");
  const r = await saved(page);
  expect(r.product).toMatchObject({ name_ar: "دهان أبيض", base_price: 25000, sale_price: 20000, stock: 10 });
  expect(r.variants).toEqual([]);
  expect(r.id).toBeNull();
});

test("a product with sizes gets its price from the sizes and saves them in the same go", async ({ page }) => {
  await page.goto(URL);
  await name(page).fill("بنتلايت");
  await sizesSwitch(page).check();
  await fillSize(page, 0, "1 لتر", "18000", "20");
  await page.getByRole("button", { name: /إضافة حجم/ }).click();
  await fillSize(page, 1, "4 لتر", "60000", "15");
  await page.getByRole("button", { name: /إضافة حجم/ }).click();
  await fillSize(page, 2, "18 لتر", "220000", "0");

  const r = await saved(page);
  expect(r.product).toMatchObject({ base_price: 18000, stock: 35, sale_price: null });
  expect(r.variants.map((v: { size_label: string }) => v.size_label)).toEqual(["1 لتر", "4 لتر", "18 لتر"]);
});

test("a validation error keeps everything the admin typed", async ({ page }) => {
  await page.goto(URL);
  await name(page).fill("اسم لا يجب أن يضيع");
  await page.locator('input[name="stock"]').fill("7");
  await saveButton(page).click();
  await expect(page.getByRole("alert").filter({ hasText: "أدخل سعرًا صحيحًا بالدينار" })).toBeVisible();
  await expect(name(page)).toHaveValue("اسم لا يجب أن يضيع");
  await expect(page.locator('input[name="stock"]')).toHaveValue("7");
});

test("size errors show on the exact row and field, and the rows stay", async ({ page }) => {
  await page.goto(URL);
  await name(page).fill("بنتلايت");
  await sizesSwitch(page).check();
  await sizeBoxes(page, "الكمية").first().fill("3");
  await saveButton(page).click();
  await expect(page.getByRole("alert").filter({ hasText: "هذا الحقل مطلوب" })).toHaveCount(1);
  await expect(page.getByRole("alert").filter({ hasText: "أدخل سعرًا صحيحًا بالدينار" })).toHaveCount(1);
  await expect(sizeBoxes(page, "الكمية").first()).toHaveValue("3");
  await expect(name(page)).toHaveValue("بنتلايت");
});

test("switching sizes on with no size left is explained", async ({ page }) => {
  await page.goto(URL);
  await name(page).fill("بنتلايت");
  await sizesSwitch(page).check();
  await page.getByRole("button", { name: "حذف الحجم 1" }).click();
  await saveButton(page).click();
  await expect(page.getByRole("alert").filter({ hasText: "أضف حجمًا واحدًا على الأقل" })).toBeVisible();
});

test("turning sizes off asks first and can be cancelled", async ({ page }) => {
  await page.goto(URL);
  await sizesSwitch(page).check();
  page.once("dialog", (d) => d.dismiss());
  await sizesSwitch(page).uncheck({ force: true }).catch(() => undefined);
  await expect(sizesSwitch(page)).toBeChecked();
  await expect(page.locator('input[name="base_price"]')).toHaveCount(0);

  page.once("dialog", (d) => d.accept());
  await sizesSwitch(page).click();
  await expect(sizesSwitch(page)).not.toBeChecked();
  await expect(page.locator('input[name="base_price"]')).toBeVisible();
});

test.describe("colour chooser", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("opens fully inside a phone screen, searches by code, and caps a long list", async ({ page }) => {
    await page.goto(URL);
    await sizesSwitch(page).check();
    await picker(page, 1).click();
    const list = page.getByRole("listbox", { name: "اللون (اختياري) 1" });
    await expect(list).toBeVisible();
    const box = (await list.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);

    await expect(list.getByRole("option")).toHaveCount(61); // "no colour" + the first 60 of 73
    await page.getByPlaceholder("ابحث بالاسم أو الرقم").fill("JW-102");
    await expect(list.getByRole("option", { name: /كريمي/ })).toBeVisible();
    await expect(list.getByRole("option", { name: /أبيض ثلجي/ })).toHaveCount(0);
    await page.getByPlaceholder("ابحث بالاسم أو الرقم").fill("لا يوجد هذا اللون");
    await expect(page.getByText("لا يوجد لون مطابق")).toBeVisible();
  });

  test("a chosen colour is shown and saved with the size", async ({ page }) => {
    await page.goto(URL);
    await name(page).fill("دهان مطبخ");
    await sizesSwitch(page).check();
    await fillSize(page, 0, "4 لتر", "65000", "8");
    await picker(page, 1).click();
    await page.getByRole("option", { name: /كريمي/ }).click();
    await expect(picker(page, 1)).toContainText("كريمي");
    await expect(picker(page, 1)).toContainText("JW-102");
    const r = await saved(page);
    expect(r.variants[0].colour_id).toBe(C(2));
  });

  test("closes with Escape and when you tap elsewhere", async ({ page }) => {
    await page.goto(URL);
    await sizesSwitch(page).check();
    await picker(page, 1).click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await picker(page, 1).click();
    await page.getByRole("heading", { name: "الصور" }).click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
  });

  test("the sizes table fits a phone: no sideways scroll, fields are wide enough", async ({ page }) => {
    await page.goto(URL);
    await sizesSwitch(page).check();
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: /إضافة حجم/ }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    for (const label of ["الحجم", "السعر (د.ع)", "الكمية"]) {
      for (const box of await Promise.all((await sizeBoxes(page, label).all()).map((b) => b.boundingBox()))) {
        expect(box!.width, label).toBeGreaterThanOrEqual(120);
      }
    }
    await page.screenshot({ path: "e2e/screenshots/admin-form-sizes-375.png", fullPage: true });
  });

  test("the save bar stays reachable at the bottom of the phone screen", async ({ page }) => {
    await page.goto(URL);
    const box = (await saveButton(page).boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(800);
    expect(box.y).toBeGreaterThan(400);
  });
});

test("the colour name is not cut off on a desktop row", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL);
  await sizesSwitch(page).check();
  const clipped = await picker(page, 1).locator("span").nth(1).evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(clipped).toBe(false);
  await expect(picker(page, 1)).toContainText("بدون لون");
  await page.screenshot({ path: "e2e/screenshots/admin-form-sizes-1280.png", fullPage: true });
});

test.describe("editing an existing product", () => {
  test("loads its details, sizes, colour and photos, and saves them back under the same id", async ({ page }) => {
    await page.goto(`${URL}?edit=1`);
    await expect(name(page)).toHaveValue("بنتلايت داخلي ممتاز");
    await expect(sizesSwitch(page)).toBeChecked();
    await expect(sizeBoxes(page, "الحجم")).toHaveCount(2);
    await expect(sizeBoxes(page, "السعر (د.ع)").first()).toHaveValue("18000");
    await expect(picker(page, 1)).toContainText("أبيض ثلجي");

    const r = await saved(page);
    expect(r.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(r.images).toEqual(["/seed/p1.png", "/seed/p1b.png"]);
    expect(r.variants.map((v: { id: string }) => v.id)).toEqual([
      "223e4567-e89b-12d3-a456-426614174001",
      "323e4567-e89b-12d3-a456-426614174002",
    ]);
    expect(r.product).toMatchObject({ base_price: 18000, stock: 35, finish: "مطفي", rooms: ["المطبخ"] });
  });

  test("reordering the photos changes the saved order", async ({ page }) => {
    await page.goto(`${URL}?edit=1`);
    await page.getByRole("button", { name: "→" }).nth(1).click(); // move the second photo earlier
    const r = await saved(page);
    expect(r.images).toEqual(["/seed/p1b.png", "/seed/p1.png"]);
  });

  test("removing a size drops it from what is saved", async ({ page }) => {
    await page.goto(`${URL}?edit=1`);
    await page.getByRole("button", { name: "حذف الحجم 2" }).click();
    const r = await saved(page);
    expect(r.variants).toHaveLength(1);
    expect(r.product.stock).toBe(20);
  });
});

test.describe("which colours a mixed paint offers", () => {
  const paintSwitch = (page: Page) => page.getByLabel("دهان يُخلط حسب اللون المطلوب");
  const section = (page: Page) => page.getByTestId("product-colours");

  test("the colours section shows only for a mixed paint, and offers every colour by default", async ({ page }) => {
    await page.goto(URL);
    await expect(section(page)).toHaveCount(0);
    await paintSwitch(page).check();
    await expect(section(page)).toBeVisible();
    await expect(page.getByLabel("كل ألوان الكتالوج")).toBeChecked();
    await expect(page.getByTestId("colour-count")).toHaveCount(0);
    await name(page).fill("دهان");
    await page.locator('input[name="base_price"]').fill("1000");
    expect((await saved(page)).colours).toEqual({ all: true, ids: [] });
  });

  test("'only these colours' lets you tick one by one, a whole family, or search", async ({ page }) => {
    await page.goto(URL);
    await paintSwitch(page).check();
    await page.getByLabel("ألوان مختارة فقط").check();
    await section(page).getByRole("group", { name: "العائلات" }).getByRole("button", { name: "الأبيض" }).click();
    await page.getByRole("button", { name: /تحديد كل المعروض \(2\)/ }).click();
    await expect(page.getByTestId("colour-count")).toHaveText("المختار: 2");

    await section(page).getByRole("group", { name: "العائلات" }).getByRole("button", { name: "كل العائلات" }).click();
    await section(page).getByRole("searchbox").fill("رمادي");
    await section(page).getByLabel(/رمادي فاتح/).check();
    await expect(page.getByTestId("colour-count")).toHaveText("المختار: 3");

    await name(page).fill("دهان");
    await page.locator('input[name="base_price"]').fill("1000");
    const colours = (await saved(page)).colours;
    expect(colours.all).toBe(false);
    expect(colours.ids.sort()).toEqual([C(1), C(2), C(3)].sort());
  });

  test("unticking and clearing work, and saving with none ticked is explained", async ({ page }) => {
    await page.goto(URL);
    await paintSwitch(page).check();
    await page.getByLabel("ألوان مختارة فقط").check();
    await section(page).getByLabel(/أبيض ثلجي/).check();
    await expect(page.getByTestId("colour-count")).toHaveText("المختار: 1");
    await section(page).getByLabel(/أبيض ثلجي/).uncheck();
    await expect(page.getByTestId("colour-count")).toHaveText("المختار: 0");
    await name(page).fill("دهان");
    await page.locator('input[name="base_price"]').fill("1000");
    await saveButton(page).click();
    await expect(page.getByText("اختر لونًا واحدًا على الأقل")).toBeVisible();
    await section(page).getByLabel(/كريمي/).check();
    await page.getByRole("button", { name: "مسح الكل" }).click();
    await expect(page.getByTestId("colour-count")).toHaveText("المختار: 0");
  });

  test("switching back to 'all colours' keeps the choice if you switch again", async ({ page }) => {
    await page.goto(URL);
    await paintSwitch(page).check();
    await page.getByLabel("ألوان مختارة فقط").check();
    await section(page).getByLabel(/كريمي/).check();
    await page.getByLabel("كل ألوان الكتالوج").check();
    await expect(section(page).getByRole("searchbox")).toHaveCount(0);
    await page.getByLabel("ألوان مختارة فقط").check();
    await expect(page.getByTestId("colour-count")).toHaveText("المختار: 1");
  });

  test("the colours section fits a phone screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(URL);
    await paintSwitch(page).check();
    await page.getByLabel("ألوان مختارة فقط").check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await section(page).screenshot({ path: "e2e/screenshots/admin-product-colours-375.png" });
  });
});
