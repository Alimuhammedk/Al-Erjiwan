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
import { deleteBannerAction, saveBannerAction } from "../../app/admin/(protected)/banners/actions";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => f.set(k, v));
  return f;
};
const image = "https://x.supabase.co/storage/v1/object/public/images/banners/a.webp";

beforeEach(() => {
  vi.clearAllMocks();
  guard.requireAdmin.mockResolvedValue({ id: "admin" });
  db.table.insert.mockResolvedValue({ error: null });
  db.eq.mockResolvedValue({ error: null });
});

describe("saveBannerAction", () => {
  it("rejects a banner without an image", async () => {
    const r = await saveBannerAction(null, {}, form({ image_url: "" }));
    expect(r.errors?.image_url).toBe(ar.admin.errors.required);
    expect(db.table.insert).not.toHaveBeenCalled();
  });

  it("rejects a javascript: link and does not insert", async () => {
    const r = await saveBannerAction(null, {}, form({ image_url: image, link: "javascript:alert(1)" }));
    expect(r.errors?.link).toBe(ar.admin.errors.invalidLink);
    expect(db.table.insert).not.toHaveBeenCalled();
  });

  it("inserts a valid banner and returns to the list", async () => {
    await expect(
      saveBannerAction(null, {}, form({ image_url: image, title: "عروض الشتاء", link: "/shop", is_active: "on" })),
    ).rejects.toThrow("REDIRECT:/admin/storefront");
    expect(db.table.insert).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: image, title: "عروض الشتاء", link: "/shop", is_active: true }),
    );
  });

  it("updates the right banner when editing", async () => {
    await expect(saveBannerAction("b1", {}, form({ image_url: image }))).rejects.toThrow("REDIRECT:/admin/storefront");
    expect(db.eq).toHaveBeenCalledWith("id", "b1");
  });

  it("does nothing when the visitor is not an admin", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveBannerAction(null, {}, form({ image_url: image }))).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe("deleteBannerAction", () => {
  it("deletes only the given banner after checking the admin", async () => {
    await expect(deleteBannerAction("b1")).rejects.toThrow("REDIRECT:/admin/storefront");
    expect(db.eq).toHaveBeenCalledWith("id", "b1");
  });

  it("does nothing when the visitor is not an admin", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(deleteBannerAction("b1")).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.table.delete).not.toHaveBeenCalled();
  });
});
