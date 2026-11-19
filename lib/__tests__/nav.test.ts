import { describe, expect, it } from "vitest";
import { isCurrent } from "../nav";

describe("isCurrent", () => {
  it("matches the home link only on the home page", () => {
    expect(isCurrent("/", "/")).toBe(true);
    expect(isCurrent("/shop", "/")).toBe(false);
  });
  it("matches a section and its sub pages", () => {
    expect(isCurrent("/shop", "/shop")).toBe(true);
    expect(isCurrent("/shop/abc", "/shop")).toBe(true);
  });
  it("does not match a different page that starts with the same letters", () => {
    expect(isCurrent("/shopping", "/shop")).toBe(false);
    expect(isCurrent("/calculator", "/shop")).toBe(false);
  });
});
