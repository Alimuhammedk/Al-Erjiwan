import { expect, test, type Page } from "@playwright/test";

// The admin order page, tried on the dev-only copy (same page, sample data, actions that only report what they were asked).
const URL = "/styleguide/order-detail";
const decode = (href: string) => decodeURIComponent(href.slice(href.indexOf("text=") + 5));

const status = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

test("shows the customer, address, items and the amount to collect", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("heading", { name: "ABCD1234", level: 1 })).toBeVisible();
  for (const text of ["علي حسين", "حي الجامعة، شارع 5، دار رقم 12", "قرب الجامع الكبير", "اتصل قبل الوصول", "بنتلايت داخلي ممتاز", "كريمي JW-102", "٤٢٠"]) {
    await expect(page.getByText(text).first()).toBeVisible();
  }
  await expect(page.getByTestId("amount-to-collect")).toHaveText("123,000 د.ع");
});

test("the phone number is a call link", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("link", { name: "07701234567" })).toHaveAttribute("href", "tel:07701234567");
  await expect(page.getByRole("link", { name: "اتصال" })).toHaveAttribute("href", "tel:07701234567");
});

for (const [from, expected] of [
  ["new", ["مؤكد", "مع شركة التوصيل", "تم التسليم", "ملغي"]],
  ["confirmed", ["مع شركة التوصيل", "تم التسليم", "ملغي"]],
  ["shipped", ["تم التسليم", "مرتجع"]],
  ["delivered", ["مرتجع"]],
] as const) {
  test(`a ${from} order offers only the allowed next steps`, async ({ page }) => {
    await page.goto(`${URL}?status=${from}`);
    const card = page.locator("section", { has: page.getByRole("heading", { name: "تغيير الحالة" }) });
    await expect(card.getByRole("button")).toHaveText([...expected]);
  });
}

for (const final of ["cancelled", "returned"]) {
  test(`a ${final} order is final`, async ({ page }) => {
    await page.goto(`${URL}?status=${final}`);
    await expect(page.getByText("هذه الحالة نهائية")).toBeVisible();
  });
}

test("a normal step goes straight through", async ({ page }) => {
  await page.goto(URL);
  await status(page, "مؤكد").click();
  await expect(page.getByRole("alert").filter({ hasText: "ECHO:status:confirmed" })).toBeVisible();
});

test("cancelling asks first, says stock comes back, and can be cancelled", async ({ page }) => {
  await page.goto(URL);
  let message = "";
  page.once("dialog", (d) => {
    message = d.message();
    void d.dismiss();
  });
  await status(page, "ملغي").click();
  expect(message).toContain("ستعود كل الكميات إلى المخزون");
  await expect(page.getByRole("alert").filter({ hasText: "ECHO:" })).toHaveCount(0);

  page.once("dialog", (d) => void d.accept());
  await status(page, "ملغي").click();
  await expect(page.getByRole("alert").filter({ hasText: "ECHO:status:cancelled" })).toBeVisible();
});

test("returning explains that mixed paint does not go back to stock", async ({ page }) => {
  await page.goto(`${URL}?status=shipped`);
  let message = "";
  page.once("dialog", (d) => {
    message = d.message();
    void d.dismiss();
  });
  await status(page, "مرتجع").click();
  expect(message).toContain("الدهان المخلوط فلا يعود");
});

test("delete exists only for a cancelled order, asks first, and is what the action receives", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("button", { name: "حذف الطلب" })).toHaveCount(0);
  await page.goto(`${URL}?status=cancelled`);
  page.once("dialog", (d) => void d.dismiss());
  await page.getByRole("button", { name: "حذف الطلب" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "ECHO:delete" })).toHaveCount(0);
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "حذف الطلب" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "ECHO:delete" })).toBeVisible();
});

test("the WhatsApp buttons open ready messages", async ({ page }) => {
  await page.goto(URL);
  const confirm = await page.getByRole("link", { name: "تأكيد الطلب عبر واتساب" }).getAttribute("href");
  expect(confirm).toMatch(/^https:\/\/wa\.me\/9647701234567\?text=/);
  const confirmText = decode(confirm!);
  for (const part of ["علي حسين", "ABCD1234", "بنتلايت داخلي ممتاز (4 لتر) كريمي JW-102 × 2", "123,000 د.ع", "يرجى التأكيد"]) expect(confirmText, part).toContain(part);

  const delivery = await page.getByRole("link", { name: "إرسال إلى شركة التوصيل" }).getAttribute("href");
  expect(delivery!.startsWith("https://wa.me/?text=")).toBe(true);
  expect(decode(delivery!)).toContain("المبلغ المطلوب تحصيله من الزبون: 123,000 د.ع");

  await expect(page.getByRole("link", { name: "تأكيد الطلب عبر واتساب" })).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: "تأكيد الطلب عبر واتساب" })).toHaveAttribute("rel", /noopener/);
});

test("copying the delivery message puts the full text on the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(URL);
  await page.getByRole("button", { name: "نسخ رسالة التوصيل" }).click();
  await expect(page.getByRole("button", { name: "تم النسخ" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("طلب توصيل رقم ABCD1234");
  expect(copied).toContain("حي الجامعة، شارع 5، دار رقم 12");
  expect(copied).toContain("المبلغ المطلوب تحصيله من الزبون: 123,000 د.ع");
});

test("the print slip link is there", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("link", { name: "طباعة ورقة التوصيل" })).toHaveAttribute("href", "/styleguide/order-detail");
});

test("a customer with earlier cancelled or returned orders gets a warning", async ({ page }) => {
  await page.goto(`${URL}?problems=2`);
  await expect(page.getByRole("alert").filter({ hasText: "لهذا الرقم 2 طلب سابق ملغي أو مرتجع" })).toBeVisible();
  await page.goto(`${URL}?problems=0`);
  await expect(page.getByText("طلب سابق ملغي أو مرتجع")).toHaveCount(0);
});

test("the notes form keeps what was typed, says saved, and shows errors on the field", async ({ page }) => {
  await page.goto(URL);
  await page.getByLabel("شركة التوصيل").fill("شركة النور");
  await page.getByLabel("رقم الشحنة أو ملاحظة التتبع").fill("556");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "تم الحفظ" })).toBeVisible();
  await expect(page.getByLabel("شركة التوصيل")).toHaveValue("شركة النور");
  await expect(page.getByLabel("رقم الشحنة أو ملاحظة التتبع")).toHaveValue("556");

  await page.getByLabel(/ملاحظة داخلية/).fill("FAIL");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByText("خطأ تجريبي")).toBeVisible();
  await expect(page.getByLabel(/ملاحظة داخلية/)).toHaveValue("FAIL");
  await expect(page.getByRole("status").filter({ hasText: "تم الحفظ" })).toHaveCount(0);
});

for (const [name, width] of [["phone", 375], ["tablet", 768], ["desktop", 1280]] as const) {
  test(`the order page fits a ${name} screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${URL}?problems=1`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    for (const box of await Promise.all((await page.locator("main a, main button").all()).map((b) => b.boundingBox()))) {
      if (box) expect(box.height, `button height at ${width}px`).toBeGreaterThanOrEqual(40);
    }
    await page.screenshot({ path: `e2e/screenshots/admin-order-${width}.png`, fullPage: true });
  });
}
