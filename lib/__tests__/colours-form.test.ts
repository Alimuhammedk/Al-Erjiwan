import { describe, expect, it } from "vitest";
import { ar } from "@/content/ar";
import { validateColour } from "../colours/form";

const ok = { name_ar: " أزرق سماوي ", hex_text: "#BFE0F2" };

describe("validateColour", () => {
  it("accepts a colour with only a name and a hex, and cleans both", () => {
    const r = validateColour(ok);
    expect(r.ok && r.value).toEqual({ name_ar: "أزرق سماوي", name_en: null, system: null, code: null, hex: "#bfe0f2", family: null });
  });
  it("keeps the optional fields, trimmed", () => {
    const r = validateColour({ ...ok, name_en: " Sky ", system: " JW ", code: " JW-301 ", family: " الأزرق " });
    expect(r.ok && r.value).toMatchObject({ name_en: "Sky", system: "JW", code: "JW-301", family: "الأزرق" });
  });
  it("uses the colour box when the typed box is empty, and prefers the typed one", () => {
    expect(validateColour({ name_ar: "لون", hex: "#112233" }).ok).toBe(true);
    const r = validateColour({ name_ar: "لون", hex: "#112233", hex_text: "#445566" });
    expect(r.ok && r.value.hex).toBe("#445566");
  });
  it("reports each problem on its own field", () => {
    const r = validateColour({ name_ar: "", hex_text: "red" });
    expect(r).toEqual({ ok: false, errors: { name_ar: ar.admin.errors.required, hex: ar.admin.colours.invalidHex } });
  });
  it("rejects over-long text", () => {
    const r = validateColour({ ...ok, name_ar: "ا".repeat(101), name_en: "a".repeat(101), system: "a".repeat(51), code: "a".repeat(41), family: "a".repeat(41) });
    expect(r.ok === false && Object.keys(r.errors).sort()).toEqual(["code", "family", "name_ar", "name_en", "system"]);
  });
  it("treats missing values as empty, not as a crash", () => {
    expect(validateColour({}).ok).toBe(false);
  });
});
