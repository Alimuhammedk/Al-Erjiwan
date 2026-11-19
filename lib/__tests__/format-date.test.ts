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

import { formatDate } from "../format";

describe("formatDate", () => {
  it("shows only the date, in Baghdad time, with ordinary digits", () => {
    const text = formatDate("2026-11-20T22:30:00Z"); // already the 21st in Baghdad (UTC+3)
    expect(text).toContain("2026");
    expect(text).toContain("21");
    expect(text).not.toMatch(/[٠-٩]/);
    expect(text).not.toMatch(/\d:\d/);
  });
  it("gives an empty text for a bad or empty date", () => {
    expect(formatDate("nope")).toBe("");
    expect(formatDate("")).toBe("");
  });
});
