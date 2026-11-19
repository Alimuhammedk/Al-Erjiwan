import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  rpc: vi.fn(),
  upsert: vi.fn(),
  stock: { value: 4 as number | null },
  tables: [] as string[],
}));
const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/auth", () => guard);
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: async () => ({
    rpc: db.rpc,
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => (db.tables.push(table), { data: db.stock.value === null ? null : { stock: db.stock.value } }) }) }),
      upsert: (v: unknown, o: unknown) => db.upsert(v, o),
    }),
  }),
}));

import { ar } from "@/content/ar";
import { adjustStockAction, saveThresholdAction } from "../../app/admin/(protected)/stock/actions";

const P = "123e4567-e89b-12d3-a456-426614174000";
const V = "223e4567-e89b-12d3-a456-426614174001";
const form = (f: Record<string, string>) => {
  const d = new FormData();
  Object.entries(f).forEach(([k, v]) => d.set(k, v));
  return d;
};
const t = ar.admin.stock;

beforeEach(() => {
  vi.clearAllMocks();
  db.tables.length = 0;
  db.stock.value = 4;
  guard.requireAdmin.mockResolvedValue({ id: "admin" });
  db.rpc.mockResolvedValue({ error: null });
  db.upsert.mockResolvedValue({ error: null });
});

describe("adjustStockAction", () => {
  it("add: sends a positive change as a manual entry", async () => {
    expect(await adjustStockAction({}, form({ product_id: P, variant_id: "", mode: "add", amount: "10" }))).toEqual({});
    expect(db.rpc).toHaveBeenCalledWith("adjust_stock", { p_product: P, p_variant: null, p_delta: 10, p_reason: "manual", p_note: t.noteArrived });
  });
  it("shop sale on a size: sends a negative change as a shop sale", async () => {
    await adjustStockAction({}, form({ product_id: P, variant_id: V, mode: "shop_sale", amount: "٢" }));
    expect(db.rpc).toHaveBeenCalledWith("adjust_stock", { p_product: P, p_variant: V, p_delta: -2, p_reason: "shop_sale", p_note: null });
  });
  it("set: sends the difference from the current number, read from the size when there is one", async () => {
    await adjustStockAction({}, form({ product_id: P, variant_id: V, mode: "set", amount: "10" }));
    expect(db.tables).toEqual(["product_variants"]);
    expect(db.rpc).toHaveBeenCalledWith("adjust_stock", expect.objectContaining({ p_delta: 6, p_reason: "manual" }));
    await adjustStockAction({}, form({ product_id: P, variant_id: "", mode: "set", amount: "1" }));
    expect(db.tables).toEqual(["product_variants", "products"]);
    expect(db.rpc).toHaveBeenLastCalledWith("adjust_stock", expect.objectContaining({ p_delta: -3 }));
  });
  it("set to the same number, or a missing product, changes nothing", async () => {
    expect((await adjustStockAction({}, form({ product_id: P, variant_id: "", mode: "set", amount: "4" }))).errors?.amount).toBe(t.noChange);
    db.stock.value = null;
    expect((await adjustStockAction({}, form({ product_id: P, variant_id: "", mode: "set", amount: "4" }))).error).toBe(ar.admin.errors.saveFailed);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("refuses bad amounts, modes and ids before the database", async () => {
    for (const amount of ["", "0", "-1", "abc", "100001"]) {
      expect((await adjustStockAction({}, form({ product_id: P, variant_id: "", mode: "add", amount }))).errors?.amount, amount).toBe(t.invalidAmount);
    }
    expect((await adjustStockAction({}, form({ product_id: P, variant_id: "", mode: "hack", amount: "1" }))).errors?.amount).toBe(t.invalidAmount);
    expect((await adjustStockAction({}, form({ product_id: "nope", variant_id: "", mode: "add", amount: "1" }))).error).toBe(ar.admin.errors.saveFailed);
    expect((await adjustStockAction({}, form({ product_id: P, variant_id: "nope", mode: "add", amount: "1" }))).error).toBe(ar.admin.errors.saveFailed);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("explains a sale larger than the stock, and hides other database text", async () => {
    db.rpc.mockResolvedValue({ error: { message: "NEGATIVE_STOCK" } });
    expect((await adjustStockAction({}, form({ product_id: P, variant_id: "", mode: "shop_sale", amount: "9" }))).errors?.amount).toBe(t.notEnough);
    db.rpc.mockResolvedValue({ error: { message: "boom" } });
    expect((await adjustStockAction({}, form({ product_id: P, variant_id: "", mode: "add", amount: "9" }))).error).toBe(ar.admin.errors.saveFailed);
  });
  it("does nothing for a non-admin", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(adjustStockAction({}, form({ product_id: P, variant_id: "", mode: "add", amount: "1" }))).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.rpc).not.toHaveBeenCalled();
  });
});

describe("saveThresholdAction", () => {
  it("saves a whole number as text under the right key, Arabic digits included", async () => {
    expect(await saveThresholdAction({}, form({ threshold: " ٠٨ " }))).toEqual({});
    expect(db.upsert).toHaveBeenLastCalledWith({ key: "low_stock_threshold", value: "8" }, { onConflict: "key" });
    await saveThresholdAction({}, form({ threshold: "8" }));
    expect(db.upsert).toHaveBeenCalledWith({ key: "low_stock_threshold", value: "8" }, { onConflict: "key" });
  });
  it.each(["", "-1", "1.5", "abc", "12345"])("refuses %j", async (v) => {
    expect((await saveThresholdAction({}, form({ threshold: v }))).errors?.threshold).toBe(t.invalidAmount);
    expect(db.upsert).not.toHaveBeenCalled();
  });
  it("refuses non-admins and reports a failed save", async () => {
    db.upsert.mockResolvedValue({ error: { message: "x" } });
    expect((await saveThresholdAction({}, form({ threshold: "5" }))).error).toBe(ar.admin.errors.saveFailed);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveThresholdAction({}, form({ threshold: "5" }))).rejects.toThrow("REDIRECT:/admin/login");
  });
});
