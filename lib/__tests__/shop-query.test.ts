import { describe, expect, it } from "vitest";
import { parseShopQuery, sanitiseSearch } from "../shop/query";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("parseShopQuery", () => {
  it("gives defaults for empty params", () => {
    expect(parseShopQuery({})).toEqual({
      q: "",
      category: null,
      brand: null,
      room: null,
      finish: null,
      min: null,
      max: null,
      sort: "newest",
      page: 1,
    });
  });
  it("keeps a valid sort and replaces an unknown one", () => {
    expect(parseShopQuery({ sort: "price_asc" }).sort).toBe("price_asc");
    expect(parseShopQuery({ sort: "zzz" }).sort).toBe("newest");
  });
  it("reads Arabic digits and ignores bad prices", () => {
    expect(parseShopQuery({ min: "٥٠٠٠" }).min).toBe(5000);
    expect(parseShopQuery({ min: "-5" }).min).toBeNull();
    expect(parseShopQuery({ max: "abc" }).max).toBeNull();
  });
  it("swaps a reversed price range", () => {
    const q = parseShopQuery({ min: "9000", max: "1000" });
    expect([q.min, q.max]).toEqual([1000, 9000]);
  });
  it("clamps the page", () => {
    expect(parseShopQuery({ page: "0" }).page).toBe(1);
    expect(parseShopQuery({ page: "-3" }).page).toBe(1);
    expect(parseShopQuery({ page: "abc" }).page).toBe(1);
    expect(parseShopQuery({ page: "7" }).page).toBe(7);
    expect(parseShopQuery({ page: "99999" }).page).toBe(500);
  });
  it("accepts only a UUID category and listed room and finish", () => {
    expect(parseShopQuery({ category: UUID }).category).toBe(UUID);
    expect(parseShopQuery({ category: "x" }).category).toBeNull();
    expect(parseShopQuery({ room: "المطبخ" }).room).toBe("المطبخ");
    expect(parseShopQuery({ room: "قبو" }).room).toBeNull();
    expect(parseShopQuery({ finish: "مطفي" }).finish).toBe("مطفي");
    expect(parseShopQuery({ finish: "x" }).finish).toBeNull();
  });
  it("takes the first item of an array value", () => {
    expect(parseShopQuery({ sort: ["price_desc", "price_asc"] }).sort).toBe("price_desc");
  });
  it("sanitises the search text", () => {
    expect(parseShopQuery({ q: "  دهان,(أبيض)  " }).q).toBe("دهان أبيض");
  });
});

describe("sanitiseSearch", () => {
  it("removes characters that could break a filter", () => {
    expect(sanitiseSearch('دهان, (أبيض) 50% "x" *')).toBe("دهان أبيض 50 x");
  });
  it("cuts long text to 60 characters", () => {
    expect(sanitiseSearch("ا".repeat(100))).toHaveLength(60);
  });
});
