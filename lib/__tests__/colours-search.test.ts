import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listColourFamilies, productColourScope, runColourSearch } from "../colours/search";

// A stand-in database that records every filter asked of it.
function fake(result: { data?: unknown; count?: number | null; error?: unknown } = { data: [], count: 0, error: null }) {
  const single = { data: result.data, error: result.error ?? null };
  const calls: unknown[][] = [];
  const chain: Record<string, unknown> = {};
  chain.maybeSingle = async () => single;
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

describe("searching only one product's colours", () => {
  it("joins the product's colour list and filters it to that product, and drops the join from the answer", async () => {
    const { db, calls } = fake({ data: [{ id: "1", name_ar: "أزرق", product_colours: [{ product_id: "p" }] }], count: 1, error: null });
    const r = await runColourSearch(db, { q: "", family: null, page: 1 }, 60, "p");
    expect(r.colours).toEqual([{ id: "1", name_ar: "أزرق" }]);
    expect(calls[0][1]).toContain("product_colours!inner(product_id)");
    expect(calls).toContainEqual(["eq", "product_colours.product_id", "p"]);
    expect(calls).toContainEqual(["range", 0, 59]);
  });
  it("lists the families of just that product's colours", async () => {
    const { db, calls } = fake({ data: [{ family: "الأزرق" }, { family: "الأزرق" }, { family: "الأبيض" }], error: null });
    expect(await listColourFamilies(db, "p")).toEqual(["الأبيض", "الأزرق"]);
    expect(calls).toContainEqual(["eq", "product_colours.product_id", "p"]);
  });
  it("does not join anything for a search over the whole catalogue", async () => {
    const { db, calls } = fake();
    await runColourSearch(db, { q: "", family: null, page: 1 });
    expect(String(calls[0][1])).not.toContain("product_colours");
  });
});

describe("productColourScope", () => {
  const scope = (data: unknown, error: unknown = null) => productColourScope(fake({ data, error }).db, "p");
  it("is 'all' for a mixed paint that offers every colour, 'list' when only chosen ones", async () => {
    expect(await scope({ all_colours: true, is_active: true, is_tintable: true })).toBe("all");
    expect(await scope({ all_colours: null, is_active: true, is_tintable: true })).toBe("all");
    expect(await scope({ all_colours: false, is_active: true, is_tintable: true })).toBe("list");
  });
  it("is 'none' for a missing, hidden or not-mixed product, or an error", async () => {
    expect(await scope(null)).toBe("none");
    expect(await scope({ all_colours: true, is_active: false, is_tintable: true })).toBe("none");
    expect(await scope({ all_colours: true, is_active: true, is_tintable: false })).toBe("none");
    expect(await scope({ all_colours: true, is_active: true, is_tintable: true }, { message: "x" })).toBe("none");
  });
});
