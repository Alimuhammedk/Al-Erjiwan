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
const writes = vi.hoisted(() => ({ replaceProductImages: vi.fn(), syncVariants: vi.fn() }));

vi.mock("@/lib/auth", () => guard);
vi.mock("@/lib/supabase/auth-server", () => ({ createAuthClient: async () => ({ from: db.from }) }));
vi.mock("@/lib/admin/product-save", async (importOriginal) => ({ ...(await importOriginal<object>()), ...writes }));
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

const ID = "123e4567-e89b-12d3-a456-426614174000";
const IMG = "https://x.supabase.co/storage/v1/object/public/images/products/a.webp";

function form(fields: Record<string, string | string[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
}
const simple = { name_ar: "دهان أبيض", base_price: "٢٥٬٠٠٠", stock: "10", is_active: "on" };
const size = (label: string, price: string, stock = "5") => ({ size_label: label, price, stock, colour_id: "" });

beforeEach(() => {
  vi.clearAllMocks();
  guard.requireAdmin.mockResolvedValue({ id: "admin" });
  db.single.mockResolvedValue({ data: { id: "p1" }, error: null });
  db.eq.mockResolvedValue({ error: null });
  writes.replaceProductImages.mockResolvedValue(null);
  writes.syncVariants.mockResolvedValue(null);
});

describe("saveProductAction: one save for product, photos and sizes", () => {
  it("creates the product, then its photos, then its sizes, and goes back to the list", async () => {
    await expect(saveProductAction({}, form({ ...simple, images: JSON.stringify([IMG]) }))).rejects.toThrow("REDIRECT:/admin/products");
    expect(db.table.insert).toHaveBeenCalledWith(expect.objectContaining({ name_ar: "دهان أبيض", base_price: 25000, is_active: true }));
    expect(writes.replaceProductImages).toHaveBeenCalledWith(expect.anything(), "p1", [IMG]);
    expect(writes.syncVariants).toHaveBeenCalledWith(expect.anything(), "p1", []);
  });

  it("saves a product with sizes using the lowest size price", async () => {
    const f = form({ name_ar: "بنتلايت", has_sizes: "on", variants: JSON.stringify([size("1 لتر", "18000"), size("4 لتر", "60000")]) });
    await expect(saveProductAction({}, f)).rejects.toThrow("REDIRECT:/admin/products");
    expect(db.table.insert).toHaveBeenCalledWith(expect.objectContaining({ base_price: 18000, stock: 10, sale_price: null }));
    expect(writes.syncVariants).toHaveBeenCalledWith(
      expect.anything(),
      "p1",
      expect.arrayContaining([expect.objectContaining({ size_label: "1 لتر", price: 18000, id: null })]),
    );
  });

  it("updates the existing product when the form carries its id", async () => {
    await expect(saveProductAction({}, form({ ...simple, id: ID }))).rejects.toThrow("REDIRECT:/admin/products");
    expect(db.table.update).toHaveBeenCalledWith(expect.objectContaining({ base_price: 25000 }));
    expect(db.eq).toHaveBeenCalledWith("id", ID);
    expect(db.table.insert).not.toHaveBeenCalled();
    expect(writes.replaceProductImages).toHaveBeenCalledWith(expect.anything(), ID, []);
  });

  it("returns every error at once and writes nothing when anything is invalid", async () => {
    const f = form({ name_ar: "", base_price: "abc", images: JSON.stringify(["javascript:x"]) });
    const r = await saveProductAction({}, f);
    expect(r.errors).toMatchObject({ name_ar: ar.admin.errors.required, base_price: ar.admin.errors.invalidPrice, images: ar.admin.errors.invalidImage });
    expect(db.from).not.toHaveBeenCalled();
    expect(writes.replaceProductImages).not.toHaveBeenCalled();
  });

  it("shows a save error and writes no photos or sizes when the product itself can't be saved", async () => {
    db.single.mockResolvedValue({ data: null, error: { message: "nope" } });
    const r = await saveProductAction({}, form(simple));
    expect(r.error).toBe(ar.admin.errors.saveFailed);
    expect(r.savedId).toBeUndefined();
    expect(writes.replaceProductImages).not.toHaveBeenCalled();
  });

  it("keeps the form on screen and remembers the product when photos or sizes fail, so a retry updates it", async () => {
    writes.replaceProductImages.mockResolvedValue(ar.admin.errors.saveFailed);
    const r = await saveProductAction({}, form(simple));
    expect(r).toEqual({ error: ar.admin.errors.partialSave, savedId: "p1" });
    expect(writes.syncVariants).toHaveBeenCalled(); // the sizes were still attempted
  });

  it("stops before any database call when the visitor is not an admin", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveProductAction({}, form(simple))).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.from).not.toHaveBeenCalled();
    expect(writes.replaceProductImages).not.toHaveBeenCalled();
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
