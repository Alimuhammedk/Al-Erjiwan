import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  mode: "ok" as "no-client" | "throws" | "error-result" | "ok",
  calls: [] as [string, unknown[]][],
}));

// Every chained call is recorded and returns the same builder; awaiting it yields the scripted result.
function builder(): object {
  const b: object = new Proxy(
    {},
    {
      get: (_t, prop: string) =>
        prop === "then"
          ? (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
              if (state.mode === "throws") reject(new Error("network down"));
              else if (state.mode === "error-result") resolve({ data: null, count: null, error: { message: "bad" } });
              else resolve({ data: [], count: 0, error: null });
            }
          : (...args: unknown[]) => {
              state.calls.push([prop, args]);
              return b;
            },
    },
  );
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => (state.mode === "no-client" ? null : { from: () => builder() }),
}));

import { getFilterOptions, getShopProducts } from "../data/shop";
import { parseShopQuery } from "../shop/query";

const empty = parseShopQuery({});

beforeEach(() => {
  state.mode = "ok";
  state.calls = [];
});

describe("getShopProducts", () => {
  it.each(["no-client", "throws", "error-result"] as const)("returns an empty result on %s", async (mode) => {
    state.mode = mode;
    expect(await getShopProducts(empty)).toEqual({ products: [], total: 0 });
  });

  it("only asks for active products", async () => {
    await getShopProducts(empty);
    expect(state.calls).toContainEqual(["eq", ["is_active", true]]);
  });

  it("sends only cleaned search text to the filter", async () => {
    await getShopProducts(parseShopQuery({ q: "a,(b)" }));
    expect(state.calls).toContainEqual(["or", ["name_ar.ilike.%a b%,name_en.ilike.%a b%"]]);
  });

  it("applies price range and sort", async () => {
    await getShopProducts(
      parseShopQuery({ min: "1000", max: "9000", sort: "price_desc" }),
    );
    expect(state.calls).toContainEqual(["gte", ["base_price", 1000]]);
    expect(state.calls).toContainEqual(["lte", ["base_price", 9000]]);
    expect(state.calls).toContainEqual(["order", ["base_price", { ascending: false }]]);
  });

  it("asks for the right page slice", async () => {
    await getShopProducts(parseShopQuery({ page: "3" }));
    expect(state.calls).toContainEqual(["range", [48, 71]]);
  });
});

describe("getFilterOptions", () => {
  it.each(["no-client", "throws", "error-result"] as const)("returns empty lists on %s", async (mode) => {
    state.mode = mode;
    expect(await getFilterOptions()).toEqual({ categories: [], brands: [] });
  });
});
