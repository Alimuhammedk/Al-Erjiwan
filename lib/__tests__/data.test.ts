import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { mode: "no-client" | "throws" | "error-result" } = { mode: "no-client" };

// Every chained call returns the same builder; awaiting it yields the scripted result.
function builder(): object {
  const b: object = new Proxy(
    {},
    {
      get: (_t, prop) =>
        prop === "then"
          ? (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
              if (state.mode === "throws") reject(new Error("network down"));
              else resolve({ data: null, error: { message: "relation does not exist" } });
            }
          : () => b,
    },
  );
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => (state.mode === "no-client" ? null : { from: () => builder() }),
}));

import { getBanners } from "../data/banners";
import { getCategories } from "../data/categories";
import { getFeaturedProducts, getSaleProducts } from "../data/products";

const fetchers = { getBanners, getCategories, getFeaturedProducts, getSaleProducts };

describe.each(Object.entries(fetchers))("%s", (_name, fetcher) => {
  beforeEach(() => {
    state.mode = "no-client";
  });
  it("returns [] when Supabase keys are missing", async () => {
    state.mode = "no-client";
    expect(await fetcher()).toEqual([]);
  });
  it("returns [] when the request throws", async () => {
    state.mode = "throws";
    expect(await fetcher()).toEqual([]);
  });
  it("returns [] when the table does not exist yet", async () => {
    state.mode = "error-result";
    expect(await fetcher()).toEqual([]);
  });
});
