import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  mode: "ok" as "no-client" | "throws" | "error-result" | "ok",
  data: {} as Record<string, unknown>,
  calls: [] as [string, string, unknown[]][],
  tables: [] as string[],
}));

function builder(table: string): object {
  const b: object = new Proxy(
    {},
    {
      get: (_t, prop: string) =>
        prop === "then"
          ? (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
              if (state.mode === "throws") reject(new Error("network down"));
              else if (state.mode === "error-result") resolve({ data: null, error: { message: "bad" } });
              else resolve({ data: state.data[table] ?? null, error: null });
            }
          : (...args: unknown[]) => {
              state.calls.push([table, prop, args]);
              return b;
            },
    },
  );
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () =>
    state.mode === "no-client"
      ? null
      : {
          from: (t: string) => {
            state.tables.push(t);
            return builder(t);
          },
        },
}));

import { getProductDetail } from "../data/shop";

const ID = "123e4567-e89b-12d3-a456-426614174000";
const product = { id: ID, name_ar: "دهان", is_active: true, is_tintable: false };

beforeEach(() => {
  state.mode = "ok";
  state.data = {};
  state.calls = [];
  state.tables = [];
});

describe("getProductDetail", () => {
  it("returns null for a malformed id without asking the database", async () => {
    expect(await getProductDetail("not-a-uuid")).toBeNull();
    expect(state.tables).toEqual([]);
  });

  it("returns null for an unknown product", async () => {
    state.data = { products: null };
    expect(await getProductDetail(ID)).toBeNull();
  });

  it.each(["no-client", "throws", "error-result"] as const)("returns null on %s", async (mode) => {
    state.mode = mode;
    expect(await getProductDetail(ID)).toBeNull();
  });

  it("asks only for active products and also refuses a hidden row", async () => {
    state.data = { products: { ...product, is_active: false } };
    expect(await getProductDetail(ID)).toBeNull();
    expect(state.calls).toContainEqual(["products", "eq", ["is_active", true]]);
  });

  it("returns photos in order, sizes and the colours the sizes use", async () => {
    state.data = {
      products: product,
      product_images: [{ url: "https://x/1.webp" }, { url: "https://x/2.webp" }],
      product_variants: [
        { id: "v1", size_label: "1 لتر", price: 1000, stock: 2, colour_id: "c1" },
        { id: "v2", size_label: "4 لتر", price: 3000, stock: 0, colour_id: null },
      ],
      colours: [{ id: "c1", name_ar: "أبيض" }],
    };
    const d = await getProductDetail(ID);
    expect(d?.images).toEqual(["https://x/1.webp", "https://x/2.webp"]);
    expect(d?.variants).toHaveLength(2);
    expect(d?.colours).toEqual([{ id: "c1", name_ar: "أبيض" }]);
    expect(state.calls).toContainEqual(["product_images", "order", ["sort_order"]]);
    expect(state.calls).toContainEqual(["colours", "in", ["id", ["c1"]]]);
  });

  it("does not load any colours for a tinted product (the picker searches the catalogue instead)", async () => {
    state.data = {
      products: { ...product, is_tintable: true },
      product_images: [],
      product_variants: [],
      colours: [{ id: "c1", name_ar: "أبيض" }],
    };
    const d = await getProductDetail(ID);
    expect(d?.colours).toEqual([]);
    expect(state.calls.some(([t]) => t === "colours")).toBe(false);
  });
});
