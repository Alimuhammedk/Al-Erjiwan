import { describe, expect, it } from "vitest";
import { displayPrice, estimateLitres, isSoldOut, stockFor } from "../shop/product";

describe("displayPrice", () => {
  it("uses a sale price that is below the base price", () => {
    expect(displayPrice({ base_price: 25000, sale_price: 20000 })).toEqual({ price: 20000, oldPrice: 25000 });
  });
  it("ignores a sale price that is not lower", () => {
    expect(displayPrice({ base_price: 25000, sale_price: 25000 })).toEqual({ price: 25000, oldPrice: null });
    expect(displayPrice({ base_price: 25000, sale_price: null })).toEqual({ price: 25000, oldPrice: null });
  });
  it("uses the chosen size price with no sale", () => {
    expect(displayPrice({ base_price: 25000, sale_price: 20000 }, { price: 60000 })).toEqual({
      price: 60000,
      oldPrice: null,
    });
  });
});

describe("stockFor", () => {
  it("uses the product stock without a size", () => {
    expect(stockFor({ stock: 5 })).toBe(5);
  });
  it("uses the size stock when a size is chosen", () => {
    expect(stockFor({ stock: 5 }, { stock: 0 })).toBe(0);
  });
});

describe("isSoldOut", () => {
  it("is sold out with no stock and no sizes", () => {
    expect(isSoldOut({ stock: 0 }, [])).toBe(true);
    expect(isSoldOut({ stock: 3 }, [])).toBe(false);
  });
  it("is not sold out when some size has stock and none is chosen", () => {
    expect(isSoldOut({ stock: 0 }, [{ stock: 0 }, { stock: 2 }])).toBe(false);
  });
  it("is sold out when the chosen size has no stock", () => {
    expect(isSoldOut({ stock: 0 }, [{ stock: 0 }, { stock: 2 }], { stock: 0 })).toBe(true);
  });
  it("is sold out when every size has no stock", () => {
    expect(isSoldOut({ stock: 9 }, [{ stock: 0 }, { stock: 0 }])).toBe(true);
  });
});

describe("estimateLitres", () => {
  const room = { length: 4, width: 3, height: 2.5, doors: 1, windows: 1, coats: 2 };
  it("rounds up whole litres", () => {
    expect(estimateLitres(room)).toBe(7);
  });
  it("rejects a non-positive dimension", () => {
    expect(estimateLitres({ ...room, length: 0 })).toBeNull();
    expect(estimateLitres({ ...room, height: -1 })).toBeNull();
  });
  it("rejects coats outside 1 to 4", () => {
    expect(estimateLitres({ ...room, coats: 5 })).toBeNull();
    expect(estimateLitres({ ...room, coats: 0 })).toBeNull();
  });
  it("rejects non-finite input", () => {
    expect(estimateLitres({ ...room, width: Number.NaN })).toBeNull();
    expect(estimateLitres({ ...room, width: Infinity })).toBeNull();
  });
  it("returns null when doors and windows cover all the wall", () => {
    expect(estimateLitres({ ...room, doors: 50 })).toBeNull();
  });
});

import { discountPercent } from "../shop/product";

describe("discountPercent", () => {
  it("gives the whole percent saved", () => {
    expect(discountPercent(25000, 20000)).toBe(20);
    expect(discountPercent(45000, 38000)).toBe(16);
  });
  it("is null when there is no real discount", () => {
    expect(discountPercent(25000, null)).toBeNull();
    expect(discountPercent(25000, 25000)).toBeNull();
    expect(discountPercent(25000, 30000)).toBeNull();
    expect(discountPercent(0, 0)).toBeNull();
  });
  it("never shows a 0% badge", () => {
    expect(discountPercent(100000, 99999)).toBeNull();
  });
});
