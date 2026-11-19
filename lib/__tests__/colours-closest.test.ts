import { describe, expect, it } from "vitest";
import { closestFrom, colourDistance } from "../colours/closest";

const list = [
  { hex: "#ffffff", name_ar: "أبيض" },
  { hex: "#000000", name_ar: "أسود" },
  { hex: "#ff0000", name_ar: "أحمر" },
  { hex: "#cc0000", name_ar: "أحمر داكن" },
  { hex: "#0000ff", name_ar: "أزرق" },
];

describe("colourDistance", () => {
  it("is 0 for the same colour, in any spelling", () => {
    expect(colourDistance("#ff0000", "FF0000")).toBe(0);
    expect(colourDistance("#f00", "#ff0000")).toBe(0);
  });
  it("is larger the further apart two colours are, and the same both ways", () => {
    expect(colourDistance("#ff0000", "#cc0000")).toBeLessThan(colourDistance("#ff0000", "#0000ff"));
    expect(colourDistance("#123456", "#abcdef")).toBeCloseTo(colourDistance("#abcdef", "#123456"), 6);
  });
  it("is infinite for a bad colour", () => {
    expect(colourDistance("nope", "#ffffff")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("closestFrom", () => {
  it("puts the exact colour first, then the nearest, farthest last (same order as the database test)", () => {
    expect(closestFrom(list, "#ff0000", 5).map((c) => c.name_ar)).toEqual(["أحمر", "أحمر داكن", "أسود", "أزرق", "أبيض"]);
  });
  it("finds white and black for near-white and near-black", () => {
    expect(closestFrom(list, "#fefefe", 1)[0].name_ar).toBe("أبيض");
    expect(closestFrom(list, "#050505", 1)[0].name_ar).toBe("أسود");
  });
  it("keeps the limit between 1 and 60 and does not change the original list", () => {
    expect(closestFrom(list, "#ff0000", 0)).toHaveLength(1);
    expect(closestFrom(list, "#ff0000", 1000)).toHaveLength(5);
    expect(list[0].name_ar).toBe("أبيض");
  });
});
