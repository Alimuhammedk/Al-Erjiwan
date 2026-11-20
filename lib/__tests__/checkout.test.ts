import { describe, expect, it } from "vitest";
import { ar } from "@/content/ar";
import { en } from "@/content/en";
import { cartToOrderItems, orderErrorMessage, parseOrderItems } from "../shop/orders";
import { normalisePhone, validateCheckout } from "../shop/checkout";
import type { CartItem } from "../cart/cart";

const e = ar.checkout.errors;
const P = "123e4567-e89b-12d3-a456-426614174000";
const V = "223e4567-e89b-12d3-a456-426614174001";

describe("normalisePhone", () => {
  it.each(["07701234567", "+964 770 123 4567", "009647701234567", "٠٧٧٠١٢٣٤٥٦٧", "0770-123-4567", "7701234567", "+9647701234567"])(
    "reads %s as 07701234567",
    (input) => expect(normalisePhone(input)).toBe("07701234567"),
  );
  it.each(["", "12345", "0770123456", "0670123456789", "abc", "077012345678", "08701234567", "+9657701234567"])(
    "rejects %j",
    (input) => expect(normalisePhone(input)).toBeNull(),
  );
});

describe("validateCheckout", () => {
  const ok = { customer_name: "علي حسين", phone: "0770 123 4567", governorate: "بغداد", city: "الكفل", landmark: "قرب الجامع" };

  it("accepts a normal order and normalises the phone", () => {
    const r = validateCheckout(ok);
    expect(r.ok && r.value).toEqual({
      customer_name: "علي حسين",
      phone: "07701234567",
      governorate: "بغداد",
      city: "الكفل",
      address: "الكفل - قرب الجامع",
      landmark: "قرب الجامع",
      notes: null,
    });
  });
  it("trims city, landmark and notes, and makes the address from the first two", () => {
    const r = validateCheckout({ ...ok, city: " الكفل ", landmark: " قرب الجامع ", notes: " اتصل أولًا " });
    expect(r.ok && r.value).toMatchObject({ city: "الكفل", landmark: "قرب الجامع", address: "الكفل - قرب الجامع", notes: "اتصل أولًا" });
  });
  it("reports each problem on its own field", () => {
    const r = validateCheckout({ customer_name: "ع", phone: "123", governorate: "", city: "", landmark: "ق" });
    expect(r).toEqual({ ok: false, errors: { customer_name: e.name, phone: e.phone, governorate: e.governorate, city: e.city, landmark: e.landmark } });
  });
  it("rejects over-long text", () => {
    const r = validateCheckout({ ...ok, customer_name: "ا".repeat(101), landmark: "ا".repeat(151), notes: "ا".repeat(501), city: "ا".repeat(101) });
    expect(r.ok === false && Object.keys(r.errors).sort()).toEqual(["city", "customer_name", "landmark", "notes"]);
  });
  it("treats missing values as empty, not as a crash", () => {
    expect(validateCheckout({}).ok).toBe(false);
  });
});

describe("parseOrderItems", () => {
  const line = { product_id: P, variant_id: V, colour_id: null, colour_note: null, quantity: 2 };
  it("accepts a good list and cleans each line", () => {
    const r = parseOrderItems(JSON.stringify([{ ...line, colour_note: "  ٤٢٠ ", price: 1, total: 5 }]));
    expect(r.ok && r.value).toEqual([{ product_id: P, variant_id: V, colour_id: null, colour_note: "٤٢٠", quantity: 2 }]);
  });
  it("never passes along a price, total or fee", () => {
    const r = parseOrderItems(JSON.stringify([{ ...line, price: 1, unit_price: 1, total: 1, delivery_fee: 0 }]));
    expect(r.ok && Object.keys(r.value[0]).sort()).toEqual(["colour_id", "colour_note", "product_id", "quantity", "variant_id"]);
  });
  it("accepts a size-less line", () => {
    const r = parseOrderItems(JSON.stringify([{ product_id: P, quantity: 1 }]));
    expect(r.ok && r.value[0]).toMatchObject({ variant_id: null, colour_id: null, colour_note: null });
  });
  it.each(["{bad", '{"a":1}', "null", '"x"', "[]", ""])("rejects %j", (json) => {
    expect(parseOrderItems(json).ok).toBe(false);
  });
  it("rejects more than 50 lines", () => {
    expect(parseOrderItems(JSON.stringify(Array(51).fill(line))).ok).toBe(false);
    expect(parseOrderItems(JSON.stringify(Array(50).fill(line))).ok).toBe(true);
  });
  it.each([0, -1, 1.5, 100, "abc", null])("rejects quantity %j", (quantity) => {
    expect(parseOrderItems(JSON.stringify([{ ...line, quantity }])).ok).toBe(false);
  });
  it("accepts a quantity typed as digits", () => {
    expect(parseOrderItems(JSON.stringify([{ ...line, quantity: "3" }])).ok).toBe(true);
  });
  it("rejects ids that are not UUIDs and over-long colour notes", () => {
    expect(parseOrderItems(JSON.stringify([{ ...line, product_id: "nope" }])).ok).toBe(false);
    expect(parseOrderItems(JSON.stringify([{ ...line, variant_id: "nope" }])).ok).toBe(false);
    expect(parseOrderItems(JSON.stringify([{ ...line, colour_id: "nope" }])).ok).toBe(false);
    expect(parseOrderItems(JSON.stringify([{ ...line, colour_note: "ا".repeat(101) }])).ok).toBe(false);
  });
});

describe("cartToOrderItems", () => {
  it("keeps only what the server needs, with no price", () => {
    const cart: CartItem[] = [
      { key: "k", product_id: P, variant_id: V, colour_id: null, colour_name: "كريمي", colour_note: "٤٢٠", name: "دهان", size_label: "4 لتر", unit_price: 60000, image_url: "/x.png", quantity: 2 },
    ];
    const items = cartToOrderItems(cart);
    expect(items).toEqual([{ product_id: P, variant_id: V, colour_id: null, colour_note: "٤٢٠", quantity: 2 }]);
    expect(JSON.stringify(items)).not.toContain("60000");
  });
});

describe("orderErrorMessage", () => {
  it("names the product when stock ran out", () => {
    expect(orderErrorMessage("OUT_OF_STOCK:بنتلايت")).toBe("نفدت كمية بنتلايت، يرجى تعديل السلة");
  });
  it("asks for a size or colour by product name", () => {
    expect(orderErrorMessage("SIZE_REQUIRED:دهان")).toBe("اختر حجم دهان");
    expect(orderErrorMessage("COLOUR_REQUIRED:دهان")).toBe("اختر لون دهان");
  });
  it.each([
    ["EMPTY_CART", e.emptyCart],
    ["ZONE_INVALID", e.zone],
    ["MIN_ORDER", e.minOrder],
    ["PRODUCT_UNAVAILABLE", e.unavailable],
    ["INVALID_INPUT", e.invalid],
  ])("maps %s", (code, text) => expect(orderErrorMessage(code)).toBe(text));
  it("falls back to a generic message for anything unknown, never raw database text", () => {
    expect(orderErrorMessage("relation \"orders\" does not exist")).toBe(e.generic);
    expect(orderErrorMessage("")).toBe(e.generic);
  });
});

describe("checkout messages in English", () => {
  it("validateCheckout names each problem in English when given the English words", () => {
    const r = validateCheckout({ customer_name: "", phone: "1", governorate: "", city: "", landmark: "" }, en.checkout.errors);
    expect(r).toEqual({ ok: false, errors: { customer_name: en.checkout.errors.name, phone: en.checkout.errors.phone, governorate: en.checkout.errors.governorate, city: en.checkout.errors.city, landmark: en.checkout.errors.landmark } });
  });
  it("order errors and cart errors read in English", () => {
    expect(orderErrorMessage("MIN_ORDER", en.checkout.errors)).toBe(en.checkout.errors.minOrder);
    expect(orderErrorMessage("SIZE_REQUIRED:Paint", en.checkout.errors)).toBe("Choose a size for Paint");
    expect(parseOrderItems("[]", en.checkout.errors)).toEqual({ ok: false, errors: { items: en.checkout.errors.emptyCart } });
  });
});
