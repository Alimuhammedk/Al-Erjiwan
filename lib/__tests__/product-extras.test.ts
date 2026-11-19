import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const delResult = vi.fn();
  const eq = vi.fn(() => delResult());
  const inFn = vi.fn(() => delResult());
  const table = {
    select: vi.fn(),
    delete: vi.fn(() => ({ eq, in: inFn })),
    insert: vi.fn(),
    upsert: vi.fn(),
  };
  const remove = vi.fn();
  return { eq, inFn, delResult, table, remove, from: vi.fn(() => table), storage: { from: vi.fn(() => ({ remove })) } };
});
const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/auth", () => guard);
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: async () => ({ from: db.from, storage: db.storage }),
}));

import { ar } from "@/content/ar";
import { saveProductImagesAction, saveVariantsAction } from "../../app/admin/(protected)/products/extras";

const PUB = "https://x.supabase.co/storage/v1/object/public/images/products/";
const PID = "123e4567-e89b-12d3-a456-426614174000";
const V1 = "223e4567-e89b-12d3-a456-426614174001";
const V2 = "323e4567-e89b-12d3-a456-426614174002";

const existing = (rows: unknown[]) =>
  db.table.select.mockReturnValue({ eq: () => Promise.resolve({ data: rows, error: null }) });

beforeEach(() => {
  vi.clearAllMocks();
  guard.requireAdmin.mockResolvedValue({ id: "admin" });
  db.delResult.mockResolvedValue({ error: null });
  db.table.insert.mockResolvedValue({ error: null });
  db.table.upsert.mockResolvedValue({ error: null });
  db.remove.mockResolvedValue({ error: null });
});

describe("saveProductImagesAction", () => {
  beforeEach(() => existing([{ url: `${PUB}a.webp` }, { url: `${PUB}b.webp` }]));

  it("writes sort_order equal to the array position", async () => {
    const urls = [`${PUB}b.webp`, `${PUB}a.webp`];
    expect(await saveProductImagesAction(PID, urls)).toEqual({});
    expect(db.table.insert).toHaveBeenCalledWith([
      { product_id: PID, url: urls[0], sort_order: 0 },
      { product_id: PID, url: urls[1], sort_order: 1 },
    ]);
  });

  it("removes dropped photos from storage after saving", async () => {
    await saveProductImagesAction(PID, [`${PUB}a.webp`]);
    expect(db.remove).toHaveBeenCalledWith(["products/b.webp"]);
  });

  it("clears every photo when the list is empty", async () => {
    expect(await saveProductImagesAction(PID, [])).toEqual({});
    expect(db.table.insert).not.toHaveBeenCalled();
    expect(db.eq).toHaveBeenCalledWith("product_id", PID);
  });

  it("rejects a photo address that is not https", async () => {
    const r = await saveProductImagesAction(PID, ["javascript:alert(1)"]);
    expect(r.error).toBe(ar.admin.errors.invalidImage);
    expect(db.table.delete).not.toHaveBeenCalled();
  });

  it("does nothing when the visitor is not an admin", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveProductImagesAction(PID, [])).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe("saveVariantsAction", () => {
  const row = { size_label: "4 لتر", price: "٦٠٬٠٠٠", stock: "5", colour_id: "" };

  it("adds a new size with a numeric price", async () => {
    existing([]);
    expect(await saveVariantsAction(PID, [row])).toEqual({});
    expect(db.table.insert).toHaveBeenCalledWith([
      { product_id: PID, size_label: "4 لتر", price: 60000, stock: 5, colour_id: null },
    ]);
    expect(db.table.delete).not.toHaveBeenCalled();
  });

  it("updates an existing size in place and deletes only the dropped ones", async () => {
    existing([{ id: V1 }, { id: V2 }]);
    expect(await saveVariantsAction(PID, [{ ...row, id: V1 }])).toEqual({});
    expect(db.table.upsert).toHaveBeenCalledWith([
      { id: V1, product_id: PID, size_label: "4 لتر", price: 60000, stock: 5, colour_id: null },
    ]);
    expect(db.inFn).toHaveBeenCalledWith("id", [V2]);
    expect(db.table.insert).not.toHaveBeenCalled();
  });

  it("returns errors and writes nothing when a row has no size", async () => {
    existing([]);
    const r = await saveVariantsAction(PID, [{ ...row, size_label: "" }]);
    expect(r.errors?.["0.size_label"]).toBe(ar.admin.errors.required);
    expect(db.table.delete).not.toHaveBeenCalled();
    expect(db.table.insert).not.toHaveBeenCalled();
    expect(db.table.upsert).not.toHaveBeenCalled();
  });

  it("does nothing when the visitor is not an admin", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveVariantsAction(PID, [row])).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.from).not.toHaveBeenCalled();
  });
});
