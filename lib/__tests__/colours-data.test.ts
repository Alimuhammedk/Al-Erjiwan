import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getColourById, productsForColour } from "../data/colours";

const ID = "123e4567-e89b-12d3-a456-426614174000";

// A stand-in database: each table answers with the given rows (or error).
function fake(tables: Record<string, { data?: unknown; error?: unknown }>) {
  const calls: unknown[][] = [];
  return {
    calls,
    db: {
      from: (table: string) => {
        const answer = tables[table] ?? { data: [], error: null };
        const chain: Record<string, unknown> = {
          then: (resolve: (v: unknown) => void) => resolve({ data: answer.data ?? null, error: answer.error ?? null }),
          maybeSingle: async () => ({ data: answer.data ?? null, error: answer.error ?? null }),
        };
        for (const m of ["select", "eq", "limit"]) {
          chain[m] = (...a: unknown[]) => {
            calls.push([table, m, ...a]);
            return chain;
          };
        }
        return chain;
      },
    } as unknown as SupabaseClient,
  };
}

describe("getColourById", () => {
  it("returns the colour, or null for a bad id, a missing colour or an error", async () => {
    expect(await getColourById(ID, fake({ colours: { data: { id: ID, hex: "#112233" } } }).db)).toEqual({ id: ID, hex: "#112233" });
    expect(await getColourById("nope", fake({}).db)).toBeNull();
    expect(await getColourById(ID, fake({ colours: { data: null } }).db)).toBeNull();
    expect(await getColourById(ID, fake({ colours: { error: { message: "x" } } }).db)).toBeNull();
    expect(await getColourById(ID, null)).toBeNull();
  });
});

describe("productsForColour", () => {
  it("lists ready-made products first, then mixed paints, without repeating a product", async () => {
    const { db } = fake({ products: { data: [{ id: "a", name_ar: "جاهز" }] } });
    // both queries hit the same fake table, so the mixed query returns the same row: it must not repeat
    expect(await productsForColour(ID, db)).toEqual([{ id: "a", name: "جاهز", kind: "ready" }]);
  });
  it("asks only for active products using this colour, and for active mixed paints", async () => {
    const { db, calls } = fake({});
    await productsForColour(ID, db);
    expect(calls).toContainEqual(["products", "eq", "product_variants.colour_id", ID]);
    expect(calls).toContainEqual(["products", "eq", "is_tintable", true]);
    expect(calls.filter((c) => c[2] === "is_active")).toHaveLength(2);
  });
  it("is empty for a bad id, no database or an error", async () => {
    expect(await productsForColour("nope", fake({}).db)).toEqual([]);
    expect(await productsForColour(ID, null)).toEqual([]);
    expect(await productsForColour(ID, fake({ products: { error: { message: "x" } } }).db)).toEqual([]);
  });
});
