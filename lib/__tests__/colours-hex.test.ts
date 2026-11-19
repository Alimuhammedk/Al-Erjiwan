import { describe, expect, it } from "vitest";
import { hslToHex, hexToHsl, normaliseHex, readableTextOn } from "../colours/hex";

describe("normaliseHex", () => {
  it.each([
    ["#AABBCC", "#aabbcc"],
    ["aabbcc", "#aabbcc"],
    ["#abc", "#aabbcc"],
    ["ABC", "#aabbcc"],
    ["  #F3E9D2 ", "#f3e9d2"],
    ["#٣٣٣٣٣٣", "#333333"],
  ])("reads %j as %s", (input, out) => expect(normaliseHex(input)).toBe(out));

  it.each(["", "#", "#12", "#12345", "#1234567", "#gggggg", "red", "rgb(1,2,3)", "##aabbcc", "#aab bcc"])("refuses %j", (input) => {
    expect(normaliseHex(input)).toBeNull();
  });
});

describe("hslToHex", () => {
  it("makes the basic colours", () => {
    expect(hslToHex(0, 100, 50)).toBe("#ff0000");
    expect(hslToHex(120, 100, 50)).toBe("#00ff00");
    expect(hslToHex(240, 100, 50)).toBe("#0000ff");
  });
  it("lightness 0 is black, 100 is white, saturation 0 is grey", () => {
    expect(hslToHex(200, 80, 0)).toBe("#000000");
    expect(hslToHex(200, 80, 100)).toBe("#ffffff");
    expect(hslToHex(200, 0, 50)).toBe("#808080");
  });
  it("wraps the hue and clamps the rest, never giving an invalid colour", () => {
    expect(hslToHex(360, 100, 50)).toBe("#ff0000");
    expect(hslToHex(-120, 100, 50)).toBe("#0000ff");
    expect(hslToHex(0, 500, 50)).toBe("#ff0000");
    expect(hslToHex(0, 100, -20)).toBe("#000000");
    expect(hslToHex(Number.NaN, 100, 50)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("hexToHsl", () => {
  it("is the reverse of hslToHex for clear colours", () => {
    expect(hexToHsl("#ff0000")).toEqual({ h: 0, s: 100, l: 50 });
    expect(hexToHsl("#0000ff")).toEqual({ h: 240, s: 100, l: 50 });
    expect(hexToHsl("#ffffff")).toEqual({ h: 0, s: 0, l: 100 });
  });
  it("gives null for a bad colour", () => {
    expect(hexToHsl("nope")).toBeNull();
  });
});

describe("readableTextOn", () => {
  it("chooses dark text on light colours and white text on dark ones", () => {
    expect(readableTextOn("#ffffff")).toBe("#1a1a1a");
    expect(readableTextOn("#f3e9d2")).toBe("#1a1a1a");
    expect(readableTextOn("#000000")).toBe("#ffffff");
    expect(readableTextOn("#2f4b9a")).toBe("#ffffff");
  });
  it("falls back to dark text for a bad colour", () => {
    expect(readableTextOn("nope")).toBe("#1a1a1a");
  });
});
