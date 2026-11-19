import { describe, expect, it } from "vitest";
import { whatsappLink } from "../store-info";

describe("whatsappLink", () => {
  it("normalises the 00 prefix and encodes the message", () => {
    expect(whatsappLink("مرحبا")).toBe(
      "https://wa.me/9647838232417?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7",
    );
  });
  it("has no text parameter when there is no message", () => {
    expect(whatsappLink()).toBe("https://wa.me/9647838232417");
  });
});
