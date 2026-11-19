import { expect, test } from "@playwright/test";

const protectedPaths = [
  "/admin/products",
  "/admin/products/new",
  "/admin/products/123e4567-e89b-12d3-a456-426614174000",
  "/admin/storefront",
  "/admin/categories",
  "/admin/categories/new",
  "/admin/banners",
  "/admin/banners/new",
  "/admin/orders",
  "/admin/orders/123e4567-e89b-12d3-a456-426614174000",
  "/admin/orders/123e4567-e89b-12d3-a456-426614174000/print",
];

for (const path of protectedPaths) {
  test(`${path} without login ends at the login page`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
}
