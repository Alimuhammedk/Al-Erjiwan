import { describe, expect, it } from "vitest";
import { priceForGovernorate } from "../admin/delivery";

describe("priceForGovernorate", () => {
  const rows = [
    { price: "4000", delivery_zones: { governorate_ar: "بغداد" } },
    { price: 6000, delivery_zones: [{ governorate_ar: "البصرة" }] },
    { price: 1, delivery_zones: null },
  ];
  it("finds the price for a governorate, whether the database sends the zone alone or in a list", () => {
    expect(priceForGovernorate(rows, "بغداد")).toBe(4000);
    expect(priceForGovernorate(rows, "البصرة")).toBe(6000);
  });
  it("is null when there is no price, no rows, or a zone is missing", () => {
    expect(priceForGovernorate(rows, "بابل")).toBeNull();
    expect(priceForGovernorate([], "بغداد")).toBeNull();
    expect(priceForGovernorate(null, "بغداد")).toBeNull();
    expect(priceForGovernorate(undefined, "بغداد")).toBeNull();
  });
  it("keeps a price of 0 (free) as 0, not as missing", () => {
    expect(priceForGovernorate([{ price: "0", delivery_zones: { governorate_ar: "بغداد" } }], "بغداد")).toBe(0);
  });
});
