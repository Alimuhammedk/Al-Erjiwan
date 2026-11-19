import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ar } from "@/content/ar";
import { replaceProductImages, syncVariants } from "../admin/product-save";

const t = vi.hoisted(() => {
  const delResult = vi.fn();
  const eq = vi.fn(() => delResult());
  const inFn = vi.fn(() => delResult());
  const table = { select: vi.fn(), delete: vi.fn(() => ({ eq, in: inFn })), insert: vi.fn(), upsert: vi.fn() };
  return { delResult, eq, inFn, table, remove: vi.fn(), from: vi.fn() };
});
const db = { from: t.from, storage: { from: () => ({ remove: t.remove }) } } as unknown as SupabaseClient;

const PUB = "https://x.supabase.co/storage/v1/object/public/images/products/";
const PID = "123e4567-e89b-12d3-a456-426614174000";
const V1 = "223e4567-e89b-12d3-a456-426614174001";
const V2 = "323e4567-e89b-12d3-a456-426614174002";
const existing = (rows: unknown[]) => t.table.select.mockReturnValue({ eq: () => Promise.resolve({ data: rows, error: null }) });

beforeEach(() => {
  vi.clearAllMocks();
  t.from.mockReturnValue(t.table);
  t.delResult.mockResolvedValue({ error: null });
  t.table.insert.mockResolvedValue({ error: null });
  t.table.upsert.mockResolvedValue({ error: null });
  t.remove.mockResolvedValue({ error: null });
});

describe("replaceProductImages", () => {
  beforeEach(() => existing([{ url: `${PUB}a.webp` }, { url: `${PUB}b.webp` }]));

  it("writes sort_order equal to the position and returns no error", async () => {
    const urls = [`${PUB}b.webp`, `${PUB}a.webp`];
    expect(await replaceProductImages(db, PID, urls)).toBeNull();
    expect(t.table.insert).toHaveBeenCalledWith([
      { product_id: PID, url: urls[0], sort_order: 0 },
      { product_id: PID, url: urls[1], sort_order: 1 },
    ]);
  });
  it("removes dropped photos from storage after saving", async () => {
    await replaceProductImages(db, PID, [`${PUB}a.webp`]);
    expect(t.remove).toHaveBeenCalledWith(["products/b.webp"]);
  });
  it("never deletes a photo file from storage when the save failed", async () => {
    t.table.insert.mockResolvedValue({ error: { message: "x" } });
    expect(await replaceProductImages(db, PID, [`${PUB}a.webp`])).toBe(ar.admin.errors.saveFailed);
    expect(t.remove).not.toHaveBeenCalled();
  });
  it("clears every photo when the list is empty", async () => {
    expect(await replaceProductImages(db, PID, [])).toBeNull();
    expect(t.table.insert).not.toHaveBeenCalled();
    expect(t.eq).toHaveBeenCalledWith("product_id", PID);
  });
  it("returns an error when the old rows can't be cleared", async () => {
    t.delResult.mockResolvedValue({ error: { message: "x" } });
    expect(await replaceProductImages(db, PID, [`${PUB}a.webp`])).toBe(ar.admin.errors.saveFailed);
    expect(t.table.insert).not.toHaveBeenCalled();
  });
});

describe("syncVariants", () => {
  const size = { size_label: "4 لتر", price: 60000, stock: 5, colour_id: null };

  it("adds a new size", async () => {
    existing([]);
    expect(await syncVariants(db, PID, [{ ...size, id: null }])).toBeNull();
    expect(t.table.insert).toHaveBeenCalledWith([{ product_id: PID, ...size }]);
    expect(t.table.delete).not.toHaveBeenCalled();
  });
  it("updates an existing size in place and deletes only the dropped ones", async () => {
    existing([{ id: V1 }, { id: V2 }]);
    expect(await syncVariants(db, PID, [{ ...size, id: V1 }])).toBeNull();
    expect(t.table.upsert).toHaveBeenCalledWith([{ id: V1, product_id: PID, ...size }]);
    expect(t.inFn).toHaveBeenCalledWith("id", [V2]);
    expect(t.table.insert).not.toHaveBeenCalled();
  });
  it("treats an unknown id as a new size, never as someone else's row", async () => {
    existing([{ id: V1 }]);
    await syncVariants(db, PID, [{ ...size, id: V2 }]);
    expect(t.table.upsert).not.toHaveBeenCalled();
    expect(t.table.insert).toHaveBeenCalledWith([{ product_id: PID, ...size }]);
    expect(t.inFn).toHaveBeenCalledWith("id", [V1]);
  });
  it("deletes every size when the list is empty (sizes switched off)", async () => {
    existing([{ id: V1 }, { id: V2 }]);
    await syncVariants(db, PID, []);
    expect(t.inFn).toHaveBeenCalledWith("id", [V1, V2]);
  });
  it("returns an error when a write fails", async () => {
    existing([]);
    t.table.insert.mockResolvedValue({ error: { message: "x" } });
    expect(await syncVariants(db, PID, [{ ...size, id: null }])).toBe(ar.admin.errors.saveFailed);
  });
});
