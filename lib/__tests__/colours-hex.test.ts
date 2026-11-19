import { describe, expect, it } from "vitest";
import { normaliseHex, readableTextOn } from "../colours/hex";

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
