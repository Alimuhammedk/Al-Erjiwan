import { describe, expect, it } from "vitest";
import { parseColourQuery } from "../colours/query";

describe("parseColourQuery", () => {
  it("defaults to no search, no family, no colour and the first page", () => {
    expect(parseColourQuery({})).toEqual({ q: "", family: null, hex: null, page: 1 });
  });
  it("cleans the search text so it cannot break the database filter", () => {
    expect(parseColourQuery({ q: "  أزرق,(سماوي)%  " }).q).toBe("أزرق سماوي");
    expect(parseColourQuery({ q: "ا".repeat(200) }).q.length).toBeLessThanOrEqual(40);
    expect(parseColourQuery({ q: `a"b'c\\d*` }).q).toBe("a b c d");
  });
  it("keeps a family as clean text and drops an empty or over-long one", () => {
    expect(parseColourQuery({ family: " الأزرق " }).family).toBe("الأزرق");
    expect(parseColourQuery({ family: "" }).family).toBeNull();
    expect(parseColourQuery({ family: "ا".repeat(60) }).family).toBeNull();
    expect(parseColourQuery({ family: "a,b" }).family).toBe("a b");
  });
  it("reads a hex with or without #, and ignores a bad one", () => {
    expect(parseColourQuery({ hex: "FF0000" }).hex).toBe("#ff0000");
    expect(parseColourQuery({ hex: "#abc" }).hex).toBe("#aabbcc");
    expect(parseColourQuery({ hex: "red" }).hex).toBeNull();
    expect(parseColourQuery({ hex: "'; drop" }).hex).toBeNull();
  });
  it("keeps the page between 1 and 500", () => {
    expect(parseColourQuery({ page: "0" }).page).toBe(1);
    expect(parseColourQuery({ page: "-3" }).page).toBe(1);
    expect(parseColourQuery({ page: "abc" }).page).toBe(1);
    expect(parseColourQuery({ page: "4" }).page).toBe(4);
    expect(parseColourQuery({ page: "99999" }).page).toBe(500);
  });
  it("takes the first value of a repeated parameter", () => {
    expect(parseColourQuery({ q: ["أحمر", "أزرق"], family: ["الأبيض", "x"] })).toMatchObject({ q: "أحمر", family: "الأبيض" });
  });
});
