import { describe, expect, it } from "vitest";

describe("Arabic content file", () => {
  it("names the store in Arabic", async () => {
    const { ar } = await import("../../content/ar");
    expect(ar.siteName).toBe("أصباغ الأرجوان");
  });
});
