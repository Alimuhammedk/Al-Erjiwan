import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const eq = vi.fn();
  const single = vi.fn();
  const table = {
    insert: vi.fn(() => ({ select: () => ({ single }) })),
    update: vi.fn(() => ({ eq })),
    delete: vi.fn(() => ({ eq })),
  };
  return { eq, single, table, from: vi.fn(() => table) };
});
const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/auth", () => guard);
vi.mock("@/lib/supabase/auth-server", () => ({ createAuthClient: async () => ({ from: db.from }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { ar } from "@/content/ar";
import {
  deleteProductAction,
  saveProductAction,
  toggleProductActiveAction,
} from "../../app/admin/(protected)/products/actions";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => f.set(k, v));
  return f;
};
const valid = { name_ar: "دهان أبيض", base_price: "٢٥٬٠٠٠", stock: "10", is_active: "on" };

beforeEach(() => {
  vi.clearAllMocks();
  guard.requireAdmin.mockResolvedValue({ id: "admin" });
  db.single.mockResolvedValue({ data: { id: "p1" }, error: null });
  db.eq.mockResolvedValue({ error: null });
});

describe("saveProductAction", () => {
  it("creates the product and opens it for photos and sizes", async () => {
    await expect(saveProductAction(null, {}, form(valid))).rejects.toThrow("REDIRECT:/admin/products/p1");
    expect(db.table.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name_ar: "دهان أبيض", base_price: 25000, is_active: true }),
    );
  });

  it("returns the price error and does not insert a bad price", async () => {
    const r = await saveProductAction(null, {}, form({ ...valid, base_price: "abc" }));
    expect(r.errors?.base_price).toBe(ar.admin.errors.invalidPrice);
    expect(db.table.insert).not.toHaveBeenCalled();
  });

  it("updates only the given product", async () => {
    await expect(saveProductAction("p9", {}, form(valid))).rejects.toThrow("REDIRECT:/admin/products");
    expect(db.table.update).toHaveBeenCalledWith(expect.objectContaining({ base_price: 25000 }));
    expect(db.eq).toHaveBeenCalledWith("id", "p9");
  });

  it("shows a save error when the database refuses an insert", async () => {
    db.single.mockResolvedValue({ data: null, error: { message: "nope" } });
    const r = await saveProductAction(null, {}, form(valid));
    expect(r.error).toBe(ar.admin.errors.saveFailed);
  });

  it("stops before any database call when the visitor is not an admin", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveProductAction(null, {}, form(valid))).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe("toggleProductActiveAction", () => {
  it("changes only is_active", async () => {
    await toggleProductActiveAction("p1", false);
    expect(db.table.update).toHaveBeenCalledWith({ is_active: false });
    expect(db.eq).toHaveBeenCalledWith("id", "p1");
  });
});

describe("deleteProductAction", () => {
  it("deletes only the given product", async () => {
    await expect(deleteProductAction("p1")).rejects.toThrow("REDIRECT:/admin/products");
    expect(db.eq).toHaveBeenCalledWith("id", "p1");
  });
});

describe("every product action requires an admin first", () => {
  beforeEach(() => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
  });
  it("toggle", async () => {
    await expect(toggleProductActiveAction("p1", true)).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.from).not.toHaveBeenCalled();
  });
  it("delete", async () => {
    await expect(deleteProductAction("p1")).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.from).not.toHaveBeenCalled();
  });
});
