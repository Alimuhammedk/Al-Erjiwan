import { describe, expect, it } from "vitest";
import { MAX_CSV_ROWS, parseColourCsv } from "../colours/csv";

const HEAD = "system,code,name_ar,name_en,hex,family";

describe("parseColourCsv", () => {
  it("reads good rows and cleans the hex", () => {
    const r = parseColourCsv(`${HEAD}\nJW,W1,أبيض ثلجي,Snow white,#F7F7F2,الأبيض\nJW,W2,كريمي,,abc,الأبيض`);
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([
      { system: "JW", code: "W1", name_ar: "أبيض ثلجي", name_en: "Snow white", hex: "#f7f7f2", family: "الأبيض" },
      { system: "JW", code: "W2", name_ar: "كريمي", name_en: null, hex: "#aabbcc", family: "الأبيض" },
    ]);
  });

  it("handles a BOM, Windows line endings, blank lines and spaces", () => {
    const r = parseColourCsv(`﻿${HEAD}\r\n\r\n  JW , W1 , أبيض , , #fff , \r\n\r\n`);
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([{ system: "JW", code: "W1", name_ar: "أبيض", name_en: null, hex: "#ffffff", family: null }]);
  });

  it("handles quoted fields with commas, doubled quotes and line breaks", () => {
    const r = parseColourCsv(`${HEAD}\nJW,Q1,"أزرق, سماوي","Sky ""light"" blue",#bfe0f2,الأزرق\nJW,Q2,"سطر\nثان",,#112233,`);
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ name_ar: "أزرق, سماوي", name_en: 'Sky "light" blue' });
    expect(r.rows[1].name_ar).toBe("سطر\nثان");
  });

  it("reads Arabic digits in codes and hex, and works without a header row", () => {
    const r = parseColourCsv("JW,١٠١,أبيض,,#٣٣٣٣٣٣,الأبيض");
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ code: "١٠١", hex: "#333333" });
  });

  it("understands a header in another order, with name as name_ar and extra columns", () => {
    const r = parseColourCsv("hex,name,code,price\n#112233,أزرق,B1,5");
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([{ system: null, code: "B1", name_ar: "أزرق", name_en: null, hex: "#112233", family: null }]);
  });

  it("lists bad rows with their line number and still returns the good ones", () => {
    const r = parseColourCsv(`${HEAD}\nJW,A1,جيد,,#112233,\nJW,A2,,,#112233,\nJW,A3,لون,,red,\nJW,A4,ل,,#112233,\nJW,A5,جيد 2,,#445566,`);
    expect(r.rows.map((x) => x.code)).toEqual(["A1", "A5"]);
    expect(r.errors.map((e) => e.line)).toEqual([3, 4, 5]);
    expect(r.errors.every((e) => e.message.length > 0)).toBe(true);
  });

  it("refuses over-long values", () => {
    const r = parseColourCsv(`${HEAD}\n${"س".repeat(51)},A1,لون,,#112233,\nJW,${"1".repeat(41)},لون,,#112233,\nJW,A3,${"ا".repeat(101)},,#112233,\nJW,A4,لون,,#112233,${"ا".repeat(41)}`);
    expect(r.rows).toEqual([]);
    expect(r.errors).toHaveLength(4);
  });

  it("when the same system and code appear twice, the last one wins and a warning is given", () => {
    const r = parseColourCsv(`${HEAD}\nJW,A1,أول,,#111111,\nJW,A1,ثان,,#222222,\n,,بلا رمز,,#333333,\n,,بلا رمز,,#333333,`);
    expect(r.rows.map((x) => x.name_ar)).toEqual(["ثان", "بلا رمز", "بلا رمز"]);
    expect(r.warnings).toEqual([{ line: 3, message: expect.any(String) }]);
  });

  it("refuses a file with too many rows, and an empty or header-only file gives nothing", () => {
    const many = `${HEAD}\n` + Array.from({ length: MAX_CSV_ROWS + 1 }, (_, i) => `JW,C${i},لون ${i},,#112233,`).join("\n");
    const r = parseColourCsv(many);
    expect(r.rows).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(parseColourCsv("").rows).toEqual([]);
    expect(parseColourCsv(HEAD).rows).toEqual([]);
    expect(parseColourCsv("   \n\n").errors).toEqual([]);
  });

  it("copes with rows that are too short or too long, and with a stray quote", () => {
    const r = parseColourCsv(`${HEAD}\nJW,A1\nJW,A2,لون,,#112233,الأبيض,extra,more\nJW,A3,"لون غير مغلق,,#112233,`);
    expect(r.rows.map((x) => x.code)).toEqual(["A2"]);
    expect(r.errors.length).toBeGreaterThanOrEqual(1);
  });
});
