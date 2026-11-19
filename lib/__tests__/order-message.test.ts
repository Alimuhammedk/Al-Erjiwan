import { describe, expect, it } from "vitest";
import { confirmationMessage } from "../shop/order-message";

const summary = {
  status: "new",
  created_at: "2026-11-20T10:00:00Z",
  total: 123000,
  items: [
    { name: "بنتلايت داخلي", size: "4 لتر", quantity: 2 },
    { name: "فرشاة طلاء", size: null, quantity: 1 },
  ],
};

describe("confirmationMessage", () => {
  const text = confirmationMessage("ABCD1234", summary);
  it("starts with the order number", () => {
    expect(text).toContain("ABCD1234");
  });
  it("lists every item with its size and quantity", () => {
    expect(text).toContain("بنتلايت داخلي (4 لتر) × 2");
    expect(text).toContain("فرشاة طلاء × 1");
  });
  it("ends with the amount to pay on delivery", () => {
    expect(text).toContain("123,000 د.ع");
  });
  it("has no personal data, only what the summary holds", () => {
    expect(text).not.toMatch(/07\d{9}/);
  });
});
