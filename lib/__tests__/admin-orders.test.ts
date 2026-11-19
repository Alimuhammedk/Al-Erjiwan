import { describe, expect, it } from "vitest";
import {
  customerWhatsAppUrl,
  deliveryMessage,
  deliveryWhatsAppUrl,
  internationalPhone,
  otherStatuses,
  costDifference,
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
  delivery_company: null,
  delivery_company_id: null,
  delivery_cost: null,
  delivery_notes: null,
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

describe("costDifference", () => {
  it("is what the customer paid for delivery minus what the company charges", () => {
    expect(costDifference(5000, 4000)).toBe(1000);
    expect(costDifference(5000, 6000)).toBe(-1000);
    expect(costDifference(0, 0)).toBe(0);
  });
  it("is null when the company has no price", () => {
    expect(costDifference(5000, null)).toBeNull();
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
  it("the update message gives the status the customer sees, and the company when there is one", () => {
    const text = decode(customerWhatsAppUrl({ ...order, status: "shipped", delivery_company: "شركة النور" }, "update"));
    expect(text).toContain("ABCD1234");
    expect(text).toContain("مع شركة التوصيل");
    expect(text).toContain("شركة النور");
    expect(decode(customerWhatsAppUrl(order, "update"))).not.toContain("شركة التوصيل:");
  });
});

describe("deliveryMessage", () => {
  const text = deliveryMessage(order);
  it("has everything a delivery company needs", () => {
    for (const part of ["ABCD1234", "علي حسين", "07701234567", "بابل", "الكفل", "حي الجامعة، شارع 5", "قرب الجامع الكبير", "اتصل قبل الوصول"]) {
      expect(text, part).toContain(part);
    }
  });
  it("lists every item with size and colour name, code or typed colour", () => {
    expect(text).toContain("بنتلايت داخلي (4 لتر) كريمي JW-102 × 2");
    expect(text).toContain("فرشاة طلاء × 1");
    expect(text).toContain("دهان مخلوط (1 لتر) ٤٢٠ × 1");
  });
  it("states the exact amount to collect, including delivery", () => {
    expect(text).toContain("المبلغ المطلوب تحصيله من الزبون: 123,000 د.ع");
    expect(text).toContain("يشمل التوصيل 5,000 د.ع");
  });
  it("includes the owner's delivery notes", () => {
    expect(deliveryMessage({ ...order, delivery_notes: "الدفع للسائق فقط" })).toContain("ملاحظات للتوصيل: الدفع للسائق فقط");
  });
  it("leaves out lines that have no value", () => {
    const bare = deliveryMessage({ ...order, landmark: null, notes: null, city: null });
    expect(bare).not.toContain("أقرب نقطة دالة");
    expect(bare).not.toContain("ملاحظات");
    expect(bare).not.toContain("null");
  });
});

describe("deliveryWhatsAppUrl", () => {
  const company = { whatsapp: "07801234567" };
  it("opens a chat with the chosen delivery company", () => {
    const url = deliveryWhatsAppUrl(order, company);
    expect(url.startsWith("https://wa.me/9647801234567?text=")).toBe(true);
    expect(decode(url)).toBe(deliveryMessage(order));
  });
  it("encodes special characters so the message is not cut off", () => {
    const url = deliveryWhatsAppUrl({ ...order, notes: "الطابق 2 & الباب الأزرق #5 ؟" }, company);
    expect(url).not.toMatch(/[&#](?!.*text=)/);
    expect(decode(url)).toContain("الطابق 2 & الباب الأزرق #5 ؟");
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
