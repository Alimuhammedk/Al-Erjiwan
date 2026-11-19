import { describe, expect, it } from "vitest";
import { formatDateTime } from "../format";

describe("formatDateTime", () => {
  it("shows the date and the time in Baghdad time, with ordinary digits", () => {
    const text = formatDateTime("2026-11-20T10:00:00Z"); // 13:00 in Baghdad
    expect(text).toContain("2026");
    expect(text).toMatch(/\b(13:00|1:00)\b/);
    expect(text).not.toMatch(/[٠-٩]/);
  });
  it("does not crash on a bad date", () => {
    expect(formatDateTime("not a date")).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });
});
