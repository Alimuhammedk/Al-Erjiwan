import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listColourFamilies, runClosestColours, runColourSearch } from "../colours/search";

// A stand-in database that records every filter asked of it.
function fake(result: { data?: unknown; count?: number | null; error?: unknown } = { data: [], count: 0, error: null }) {
  const calls: unknown[][] = [];
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "or", "eq", "order", "range", "not", "limit"]) {
    chain[m] = (...a: unknown[]) => {
      calls.push([m, ...a]);
      return m === "range" || m === "limit" ? Promise.resolve(result) : chain;
    };
  }
  const rpc = vi.fn(async () => result);
  return { db: { from: () => chain, rpc } as unknown as SupabaseClient, calls, rpc };
}

describe("runColourSearch", () => {
  it("searches name, English name and code, filters the family and asks for one page", async () => {
    const { db, calls } = fake({ data: [{ id: "1" }], count: 50, error: null });
    const r = await runColourSearch(db, { q: "أزرق", family: "الأزرق", page: 3 });
    expect(r).toEqual({ colours: [{ id: "1" }], total: 50 });
    expect(calls).toContainEqual(["or", "name_ar.ilike.%أزرق%,name_en.ilike.%أزرق%,code.ilike.%أزرق%"]);
    expect(calls).toContainEqual(["eq", "family", "الأزرق"]);
    expect(calls).toContainEqual(["range", 48, 71]);
  });
  it("adds no filter when nothing was typed", async () => {
    const { db, calls } = fake();
    await runColourSearch(db, { q: "", family: null, page: 1 });
    expect(calls.map((c) => c[0])).not.toContain("or");
    expect(calls.map((c) => c[0])).not.toContain("eq");
    expect(calls).toContainEqual(["range", 0, 23]);
  });
  it("gives an empty result instead of an error", async () => {
    expect(await runColourSearch(fake({ error: { message: "x" } }).db, { q: "", family: null, page: 1 })).toEqual({ colours: [], total: 0 });
    const boom = { from: () => { throw new Error("down"); } } as unknown as SupabaseClient;
    expect(await runColourSearch(boom, { q: "", family: null, page: 1 })).toEqual({ colours: [], total: 0 });
  });
});

describe("listColourFamilies", () => {
  it("returns each family once, sorted", async () => {
    const { db } = fake({ data: [{ family: "الأزرق" }, { family: "الأبيض" }, { family: "الأزرق" }], error: null });
    expect(await listColourFamilies(db)).toEqual(["الأبيض", "الأزرق"]);
  });
  it("is empty on an error", async () => {
    expect(await listColourFamilies(fake({ error: { message: "x" } }).db)).toEqual([]);
  });
});

describe("runClosestColours", () => {
  it("asks the database function with the colour and the limit", async () => {
    const { db, rpc } = fake({ data: [{ id: "1" }], error: null });
    expect(await runClosestColours(db, "#ff0000", 6)).toEqual([{ id: "1" }]);
    expect(rpc).toHaveBeenCalledWith("closest_colours", { p_hex: "#ff0000", p_limit: 6 });
  });
  it("is empty on an error", async () => {
    expect(await runClosestColours(fake({ error: { message: "x" } }).db, "#ff0000")).toEqual([]);
  });
});
