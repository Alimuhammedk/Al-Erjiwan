import { expect, test } from "@playwright/test";

const item = {
  key: JSON.stringify(["p1", "v1", null, null]),
  product_id: "p1",
  variant_id: "v1",
  colour_id: null,
  colour_name: null,
  colour_note: null,
  name: "دهان تجريبي",
  size_label: "4 لتر",
  unit_price: 60000,
  image_url: null,
  quantity: 2,
};

test("the cart page shows an empty message with a link to the shop", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByText("السلة فارغة")).toBeVisible();
  await expect(page.getByRole("link", { name: "متابعة التسوق" }).first()).toBeVisible();
});

test("the cart page lists saved items, changes quantity and removes them", async ({ page }) => {
  await page.addInitScript((i) => localStorage.setItem("al-erjiwan-cart", JSON.stringify([i])), item);
  await page.goto("/cart");

  await expect(page.getByText("دهان تجريبي")).toBeVisible();
  await expect(page.getByText("120,000 د.ع").first()).toBeVisible(); // 2 × 60,000

  await page.getByRole("button", { name: "زيادة الكمية" }).click();
  await expect(page.getByText("180,000 د.ع").first()).toBeVisible();

  await page.getByRole("button", { name: "تقليل الكمية" }).click();
  await page.getByRole("button", { name: "تقليل الكمية" }).click();
  await expect(page.getByRole("button", { name: "تقليل الكمية" })).toBeDisabled();
  await expect(page.getByText("60,000 د.ع").first()).toBeVisible();

  await page.getByRole("button", { name: "حذف" }).click();
  await expect(page.getByText("السلة فارغة")).toBeVisible();
});

test("cart buttons are big enough to tap (44px)", async ({ page }) => {
  await page.addInitScript((i) => localStorage.setItem("al-erjiwan-cart", JSON.stringify([i])), item);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/cart");
  for (const name of ["زيادة الكمية", "تقليل الكمية", "حذف"]) {
    const box = await page.getByRole("button", { name }).boundingBox();
    expect(box!.width, `${name} width`).toBeGreaterThanOrEqual(44);
    expect(box!.height, `${name} height`).toBeGreaterThanOrEqual(44);
  }
});

test("a corrupted saved cart is ignored", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("al-erjiwan-cart", "{not json"));
  const response = await page.goto("/cart");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByText("السلة فارغة")).toBeVisible();
});

test("the header cart badge shows the saved count", async ({ page }) => {
  await page.addInitScript((i) => localStorage.setItem("al-erjiwan-cart", JSON.stringify([i])), item);
  await page.goto("/shop");
  await expect(page.getByRole("link", { name: "السلة (2)" })).toBeVisible();
});
