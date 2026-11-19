import { describe, expect, it } from "vitest";
import {
  addItem,
  cartCount,
  cartKey,
  cartTotal,
  parseCart,
  removeItem,
  setQuantity,
  type CartItem,
} from "../cart/cart";

const base: Omit<CartItem, "key"> = {
  product_id: "p1",
  variant_id: "v1",
  colour_id: null,
  colour_name: null,
  colour_note: null,
  name: "دهان أبيض",
  size_label: "4 لتر",
  unit_price: 60000,
  image_url: null,
  quantity: 1,
};
const withKey = (i: typeof base): CartItem => ({ ...i, key: cartKey(i) });

describe("addItem", () => {
  it("merges the same product, size and colour", () => {
    const cart = addItem(addItem([], base), base);
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });
  it("keeps a different size as another line", () => {
    const cart = addItem(addItem([], base), { ...base, variant_id: "v2" });
    expect(cart).toHaveLength(2);
  });
  it("keeps a different colour note as another line", () => {
    const cart = addItem(addItem([], base), { ...base, colour_note: "٤٢٠" });
    expect(cart).toHaveLength(2);
  });
  it("caps the quantity at 99", () => {
    const cart = addItem([withKey({ ...base, quantity: 98 })], { ...base, quantity: 5 });
    expect(cart[0].quantity).toBe(99);
  });
});

describe("setQuantity", () => {
  const cart = [withKey(base)];
  const key = cart[0].key;
  it("clamps to whole numbers from 1 to 99", () => {
    expect(setQuantity(cart, key, 0)[0].quantity).toBe(1);
    expect(setQuantity(cart, key, 2.7)[0].quantity).toBe(2);
    expect(setQuantity(cart, key, 500)[0].quantity).toBe(99);
    expect(setQuantity(cart, key, Number.NaN)[0].quantity).toBe(1);
  });
});

describe("removeItem, cartCount, cartTotal", () => {
  const a = withKey(base);
  const b = withKey({ ...base, variant_id: "v2", unit_price: 1000, quantity: 3 });
  it("removes only the given line", () => {
    expect(removeItem([a, b], a.key)).toEqual([b]);
  });
  it("counts units and totals the price", () => {
    expect(cartCount([a, b])).toBe(4);
    expect(cartTotal([a, b])).toBe(60000 + 3000);
  });
});

describe("parseCart", () => {
  it("returns an empty cart for missing or broken data", () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart("{bad")).toEqual([]);
    expect(parseCart('{"a":1}')).toEqual([]);
  });
  it("keeps valid items and drops ones with a bad field", () => {
    const good = withKey(base);
    const broken = { ...withKey({ ...base, variant_id: "v2" }), unit_price: undefined };
    expect(parseCart(JSON.stringify([good, broken]))).toEqual([good]);
  });
  it("keeps the colour name, and treats a missing one as null", () => {
    const named = withKey({ ...base, colour_id: "c1", colour_name: "أبيض ثلجي" });
    expect(parseCart(JSON.stringify([named]))[0].colour_name).toBe("أبيض ثلجي");
    const old: Record<string, unknown> = { ...withKey(base) };
    delete old.colour_name;
    expect(parseCart(JSON.stringify([old]))[0].colour_name).toBeNull();
  });
  it("clamps a huge stored quantity", () => {
    const stored = [{ ...withKey(base), quantity: 1000 }];
    expect(parseCart(JSON.stringify(stored))[0].quantity).toBe(99);
  });
  it("drops an item with a negative or non-numeric price", () => {
    const neg = { ...withKey(base), unit_price: -5 };
    const str = { ...withKey({ ...base, variant_id: "v3" }), unit_price: "10" };
    expect(parseCart(JSON.stringify([neg, str]))).toEqual([]);
  });
});
