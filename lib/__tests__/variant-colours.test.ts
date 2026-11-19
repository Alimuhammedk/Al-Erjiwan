import { describe, expect, it } from "vitest";
import { addColourLines, takenColours, type SizeLine } from "../admin/variant-colours";

const line = (size_label: string, colour_id = "", price = "60000", stock = "10", id = ""): SizeLine => ({ id, size_label, price, stock, colour_id });

describe("addColourLines", () => {
  it("a line with no colour takes the first ticked colour, and the others become new lines right after it", () => {
    const rows = [line("4 لتر"), line("18 لتر")];
    const r = addColourLines(rows, 0, ["a", "b", "c"]);
    expect(r.map((x) => [x.size_label, x.colour_id])).toEqual([["4 لتر", "a"], ["4 لتر", "b"], ["4 لتر", "c"], ["18 لتر", ""]]);
  });
  it("new lines copy the size and price, start at stock 0 and are new (no id)", () => {
    const r = addColourLines([line("4 لتر", "", "55000", "12", "v1")], 0, ["a", "b"]);
    expect(r[0]).toEqual({ id: "v1", size_label: "4 لتر", price: "55000", stock: "12", colour_id: "a" });
    expect(r[1]).toEqual({ id: "", size_label: "4 لتر", price: "55000", stock: "0", colour_id: "b" });
  });
  it("a line that already has a colour keeps it, and every ticked colour becomes a new line", () => {
    const r = addColourLines([line("4 لتر", "red")], 0, ["a", "b"]);
    expect(r.map((x) => x.colour_id)).toEqual(["red", "a", "b"]);
  });
  it("skips colours the same size already offers (also on other lines, any spelling of the size) and repeats", () => {
    const rows = [line("4 لتر"), line(" 4 لتر ", "a"), line("1 لتر", "b")];
    const r = addColourLines(rows, 0, ["a", "b", "b", "c"]);
    expect(r.map((x) => [x.size_label.trim(), x.colour_id])).toEqual([["4 لتر", "b"], ["4 لتر", "c"], ["4 لتر", "a"], ["1 لتر", "b"]]);
  });
  it("does nothing for no colours, only taken colours, empty ids or a bad index", () => {
    const rows = [line("4 لتر", "a")];
    expect(addColourLines(rows, 0, [])).toBe(rows);
    expect(addColourLines(rows, 0, ["a"])).toBe(rows);
    expect(addColourLines(rows, 0, [""])).toBe(rows);
    expect(addColourLines(rows, 5, ["x"])).toBe(rows);
  });
  it("does not change the original rows", () => {
    const rows = [line("4 لتر")];
    addColourLines(rows, 0, ["a", "b"]);
    expect(rows).toEqual([line("4 لتر")]);
  });
});

describe("takenColours", () => {
  it("lists the colours other lines of the same size offer", () => {
    const rows = [line("4 لتر"), line("4 لتر", "a"), line("1 لتر", "b"), line("4 لتر", "")];
    expect([...takenColours(rows, 0)]).toEqual(["a"]);
    expect([...takenColours(rows, 2)]).toEqual([]);
    expect(takenColours(rows, 9).size).toBe(0);
  });
});
