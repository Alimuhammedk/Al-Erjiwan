import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const eq = vi.fn();
  const table = {
    insert: vi.fn(),
    update: vi.fn(() => ({ eq })),
    delete: vi.fn(() => ({ eq })),
  };
  return { eq, table, from: vi.fn(() => table) };
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
import { deleteCategoryAction, saveCategoryAction } from "../../app/admin/(protected)/categories/actions";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => f.set(k, v));
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  guard.requireAdmin.mockResolvedValue({ id: "admin" });
  db.table.insert.mockResolvedValue({ error: null });
  db.eq.mockResolvedValue({ error: null });
});

describe("saveCategoryAction", () => {
  it("inserts a valid new category and goes back to the list", async () => {
    await expect(saveCategoryAction(null, {}, form({ name_ar: "دهانات داخلية", sort_order: "1" }))).rejects.toThrow(
      "REDIRECT:/admin/categories",
    );
    expect(db.from).toHaveBeenCalledWith("categories");
    expect(db.table.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name_ar: "دهانات داخلية", sort_order: 1 }),
    );
  });

  it("returns field errors and does not insert when the name is blank", async () => {
    const r = await saveCategoryAction(null, {}, form({ name_ar: "" }));
    expect(r.errors?.name_ar).toBe(ar.admin.errors.required);
    expect(db.table.insert).not.toHaveBeenCalled();
  });

  it("updates the right row when editing", async () => {
    await expect(saveCategoryAction("c1", {}, form({ name_ar: "جديد" }))).rejects.toThrow("REDIRECT:/admin/categories");
    expect(db.table.update).toHaveBeenCalledWith(expect.objectContaining({ name_ar: "جديد" }));
    expect(db.eq).toHaveBeenCalledWith("id", "c1");
  });

  it("shows a save error when the database refuses", async () => {
    db.table.insert.mockResolvedValue({ error: { message: "nope" } });
    const r = await saveCategoryAction(null, {}, form({ name_ar: "فئة" }));
    expect(r.error).toBe(ar.admin.errors.saveFailed);
  });

  it("stops before any database call when the visitor is not an admin", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveCategoryAction(null, {}, form({ name_ar: "فئة" }))).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe("deleteCategoryAction", () => {
  it("deletes only the given row after checking the admin", async () => {
    await expect(deleteCategoryAction("c1")).rejects.toThrow("REDIRECT:/admin/categories");
    expect(guard.requireAdmin).toHaveBeenCalled();
    expect(db.eq).toHaveBeenCalledWith("id", "c1");
  });

  it("does nothing when the visitor is not an admin", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(deleteCategoryAction("c1")).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.table.delete).not.toHaveBeenCalled();
  });
});
