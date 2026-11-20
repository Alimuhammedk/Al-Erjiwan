import { describe, expect, it } from "vitest";
import {
  customerWhatsAppUrl,
  internationalPhone,
  otherStatuses,
  fillTemplate,
  DEFAULT_TEMPLATES,
  type AdminOrder,
} from "../admin/orders";

const order: AdminOrder = {
  id: "o1",
  code: "ABCD1234",
  customer_name: "علي حسين",
  phone: "07701234567",
  governorate: "بابل",
  city: "الكفل",
  address: "حي الجامعة، شارع 5",
  landmark: "قرب الجامع الكبير",
  notes: "اتصل قبل الوصول",
  subtotal: 118000,
  delivery_fee: 5000,
  total: 123000,
  status: "new",
  created_at: "2026-11-20T10:00:00Z",
  updated_at: "2026-11-20T10:00:00Z",
  items: [
    { product_name: "بنتلايت داخلي", size_label: "4 لتر", colour_name: "كريمي", colour_code: "JW-102", colour_note: null, quantity: 2, unit_price: 59000 },
    { product_name: "فرشاة طلاء", size_label: null, colour_name: null, colour_code: null, colour_note: null, quantity: 1, unit_price: 0 },
    { product_name: "دهان مخلوط", size_label: "1 لتر", colour_name: null, colour_code: null, colour_note: "٤٢٠", quantity: 1, unit_price: 0 },
  ],
};
const decode = (url: string) => decodeURIComponent(url.slice(url.indexOf("text=") + 5));

describe("otherStatuses", () => {
  it.each(["new", "confirmed", "shipped", "delivered", "cancelled", "returned"])("offers every status except %s", (s) => {
    const others = otherStatuses(s);
    expect(others).toHaveLength(5);
    expect(others).not.toContain(s);
  });
  it("keeps the usual order", () => {
    expect(otherStatuses("shipped")).toEqual(["new", "confirmed", "delivered", "cancelled", "returned"]);
  });
});

describe("internationalPhone", () => {
  it("turns 07... into the form wa.me wants", () => {
    expect(internationalPhone("07701234567")).toBe("9647701234567");
  });
});

describe("customerWhatsAppUrl", () => {
  it("opens a chat with the customer, not the shop", () => {
    expect(customerWhatsAppUrl(order, "confirm")).toMatch(/^https:\/\/wa\.me\/9647701234567\?text=/);
  });
  it("the confirm message names the order, items, amount, address and asks to confirm", () => {
    const text = decode(customerWhatsAppUrl(order, "confirm"));
    for (const part of ["علي حسين", "ABCD1234", "بنتلايت داخلي (4 لتر) كريمي JW-102 × 2", "فرشاة طلاء × 1", "123,000 د.ع", "بابل", "حي الجامعة، شارع 5", "يرجى التأكيد"]) {
      expect(text, part).toContain(part);
    }
  });
  it("the update message gives the status the customer sees", () => {
    const text = decode(customerWhatsAppUrl({ ...order, status: "shipped" }, "update"));
    expect(text).toContain("ABCD1234");
    expect(text).toContain("قيد التوصيل");
    expect(text).not.toContain("شركة");
  });
});

import { parseOrderListQuery } from "../admin/orders";

describe("parseOrderListQuery", () => {
  it("defaults to every status, no search and the first page", () => {
    expect(parseOrderListQuery({})).toEqual({ status: null, q: "", page: 1 });
  });
  it("keeps a real status and drops an unknown one", () => {
    expect(parseOrderListQuery({ status: "shipped" }).status).toBe("shipped");
    expect(parseOrderListQuery({ status: "hacked" }).status).toBeNull();
  });
  it("cleans the search text so it cannot break the database filter", () => {
    expect(parseOrderListQuery({ q: "  علي,(حسين)%  " }).q).toBe("علي حسين");
    expect(parseOrderListQuery({ q: "ا".repeat(200) }).q).toHaveLength(40);
  });
  it("keeps the page between 1 and 500", () => {
    expect(parseOrderListQuery({ page: "0" }).page).toBe(1);
    expect(parseOrderListQuery({ page: "-4" }).page).toBe(1);
    expect(parseOrderListQuery({ page: "abc" }).page).toBe(1);
    expect(parseOrderListQuery({ page: "3" }).page).toBe(3);
    expect(parseOrderListQuery({ page: "999999" }).page).toBe(500);
  });
  it("takes the first value when a parameter is repeated", () => {
    expect(parseOrderListQuery({ status: ["new", "shipped"] }).status).toBe("new");
  });
});

describe("fillTemplate", () => {
  it("fills every placeholder from the order", () => {
    const text = fillTemplate("{name}|{code}|{status}|{total}|{address}|{items}", order);
    expect(text).toContain("علي حسين|ABCD1234|قيد المراجعة|123,000 د.ع (يشمل التوصيل 5,000 د.ع)|بابل - الكفل - حي الجامعة، شارع 5|- بنتلايت داخلي (4 لتر) كريمي JW-102 × 2");
    expect(text).toContain("- فرشاة طلاء × 1");
  });
  it("fills a placeholder used more than once, and keeps unknown words as typed", () => {
    expect(fillTemplate("{name} {name} {nothing}", order)).toBe("علي حسين علي حسين {nothing}");
  });
  it("leaves out a line whose only value is empty, but keeps lines that have text of their own", () => {
    expect(fillTemplate("مرحبًا {name}\nشركة التوصيل: {company}\nشكرًا", order)).toBe("مرحبًا علي حسين\nشكرًا");
    expect(fillTemplate("سطر عادي\n\nسطر", order)).toBe("سطر عادي\n\nسطر");
  });
  it("is safe with special characters in the order's own text", () => {
    expect(fillTemplate("{name}", { ...order, customer_name: "$& {code} $1" })).toBe("$& {code} $1");
  });
  it("the built-in templates read well and match the old fixed messages", () => {
    const confirm = fillTemplate(DEFAULT_TEMPLATES.confirm, order);
    for (const part of ["علي حسين", "ABCD1234", "123,000 د.ع", "بابل", "يرجى التأكيد"]) expect(confirm).toContain(part);
    expect(confirm).not.toMatch(/\{\w+\}/);
  });
});

describe("customerWhatsAppUrl with a template", () => {
  it("uses the given wording instead of the built-in one", () => {
    const url = customerWhatsAppUrl(order, "update", "أهلاً {name}، طلبك {status}");
    expect(url).toMatch(/^https:\/\/wa\.me\/9647701234567\?text=/);
    expect(decode(url)).toBe("أهلاً علي حسين، طلبك قيد المراجعة");
  });
});
