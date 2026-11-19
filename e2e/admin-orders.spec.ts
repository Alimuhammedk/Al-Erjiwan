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

const ALL = ["جديد", "مؤكد", "مع شركة التوصيل", "تم التسليم", "ملغي", "مرتجع"];
const statusCard = (page: Page) => page.locator("section", { has: page.getByRole("heading", { name: "حالة الطلب" }) });

for (const [from, label] of [
  ["new", "جديد"],
  ["confirmed", "مؤكد"],
  ["shipped", "مع شركة التوصيل"],
  ["delivered", "تم التسليم"],
  ["cancelled", "ملغي"],
  ["returned", "مرتجع"],
] as const) {
  test(`a ${from} order still shows all six statuses, with the current one marked`, async ({ page }) => {
    await page.goto(`${URL}?status=${from}`);
    const buttons = statusCard(page).getByRole("button");
    await expect(buttons).toHaveText(ALL);
    for (const name of ALL) {
      await expect(status(page, name)).toHaveAttribute("aria-pressed", String(name === label));
    }
  });
}

test("a cancelled order can be reopened after a confirmation about stock", async ({ page }) => {
  await page.goto(`${URL}?status=cancelled`);
  let message = "";
  page.once("dialog", (d) => {
    message = d.message();
    void d.accept();
  });
  await status(page, "جديد").click();
  expect(message).toContain("سيُسحب المخزون من جديد");
  await expect(page.getByRole("alert").filter({ hasText: "ECHO:status:new" })).toBeVisible();
});

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

for (const [from, text] of [
  ["new", "ستعود كمياته إلى المخزون"],
  ["delivered", "فلن تعود كمياته إلى المخزون"],
  ["cancelled", "لن تتغير الكميات في المخزون"],
] as const) {
  test(`a ${from} order can be deleted after a confirmation that explains stock`, async ({ page }) => {
    await page.goto(`${URL}?status=${from}`);
    let message = "";
    page.once("dialog", (d) => {
      message = d.message();
      void d.dismiss();
    });
    await page.getByRole("button", { name: "حذف الطلب" }).click();
    expect(message).toContain("ABCD1234");
    expect(message).toContain(text);
    await expect(page.getByRole("alert").filter({ hasText: "ECHO:delete" })).toHaveCount(0);
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: "حذف الطلب" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "ECHO:delete" })).toBeVisible();
  });
}

test("the customer WhatsApp buttons open ready messages", async ({ page }) => {
  await page.goto(URL);
  const confirm = await page.getByRole("link", { name: "تأكيد الطلب عبر واتساب" }).getAttribute("href");
  expect(confirm).toMatch(/^https:\/\/wa\.me\/9647701234567\?text=/);
  const confirmText = decode(confirm!);
  for (const part of ["علي حسين", "ABCD1234", "بنتلايت داخلي ممتاز (4 لتر) كريمي JW-102 × 2", "123,000 د.ع", "يرجى التأكيد"]) expect(confirmText, part).toContain(part);
  await expect(page.getByRole("link", { name: "تأكيد الطلب عبر واتساب" })).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: "تأكيد الطلب عبر واتساب" })).toHaveAttribute("rel", /noopener/);
});

test("there is no copy-message button and no old delivery card", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("button", { name: "نسخ رسالة التوصيل" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "التوصيل والملاحظات" })).toHaveCount(0);
  await expect(page.getByLabel("رقم الشحنة أو ملاحظة التتبع")).toHaveCount(0);
});

test("sending to the delivery company needs a chosen company, then opens WhatsApp to its number", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("link", { name: "إرسال إلى شركة التوصيل" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "إرسال إلى شركة التوصيل" })).toBeDisabled();

  await page.getByRole("combobox").selectOption({ label: "شركة السرعة" });
  const link = page.getByRole("link", { name: "إرسال إلى شركة التوصيل" });
  const href = await link.getAttribute("href");
  expect(href!.startsWith("https://wa.me/9647801234567?text=")).toBe(true);
  const text = decode(href!);
  expect(text).toContain("المبلغ المطلوب تحصيله من الزبون: 123,000 د.ع");
  expect(text).toContain("ملاحظات للتوصيل: زبون جديد");
  await expect(page.getByTestId("company-price")).toHaveText("4,000 د.ع");
  await expect(page.getByTestId("company-difference")).toHaveText("1,000 د.ع");

  await page.getByRole("combobox").selectOption({ label: "شركة النور" });
  await expect(page.getByTestId("company-difference")).toHaveText("-1,500 د.ع");
  await expect(link).toHaveAttribute("href", /wa\.me\/9647901234567/);

  await page.getByRole("combobox").selectOption({ label: "شركة بلا سعر" });
  await expect(page.getByTestId("company-price")).toHaveText("لا يوجد سعر لهذه المحافظة");
  await expect(page.getByTestId("company-difference")).toHaveCount(0);
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

test("there is one notes box; it keeps what was typed, says saved, and shows errors on the field", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByLabel(/ملاحظات لشركة التوصيل/)).toHaveValue("زبون جديد");
  await page.getByLabel(/ملاحظات لشركة التوصيل/).fill("اتصل قبل الوصول بنصف ساعة");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "تم الحفظ" })).toBeVisible();
  await expect(page.getByLabel(/ملاحظات لشركة التوصيل/)).toHaveValue("اتصل قبل الوصول بنصف ساعة");

  await page.getByLabel(/ملاحظات لشركة التوصيل/).fill("FAIL");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByText("خطأ تجريبي")).toBeVisible();
  await expect(page.getByLabel(/ملاحظات لشركة التوصيل/)).toHaveValue("FAIL");
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
