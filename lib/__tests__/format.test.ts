import { describe, expect, it } from "vitest";
import { formatPrice } from "../format";

describe("formatPrice", () => {
  it("formats whole dinar with a thousands separator", () => {
    expect(formatPrice(25000)).toBe("25,000 د.ع");
  });
  it("formats zero", () => {
    expect(formatPrice(0)).toBe("0 د.ع");
  });
  it("formats millions", () => {
    expect(formatPrice(1250000)).toBe("1,250,000 د.ع");
  });
  it("rounds to whole dinar", () => {
    expect(formatPrice(25000.6)).toBe("25,001 د.ع");
  });
});
