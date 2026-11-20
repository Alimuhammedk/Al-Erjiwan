import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ write: vi.fn(), del: vi.fn() }));
const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/auth", () => guard);
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: async () => ({
    from: () => ({
      insert: (v: unknown) => db.write("insert", v),
      update: (v: unknown) => ({ eq: (c: string, id: string) => db.write("update", v, c, id) }),
      delete: () => ({ eq: (c: string, id: string) => db.del(c, id) }),
    }),
  }),
}));

import { ar } from "@/content/ar";
import { deleteArticleAction, saveArticleAction, toggleArticleAction } from "../../app/admin/(protected)/articles/actions";

const ID = "123e4567-e89b-12d3-a456-426614174000";
const COVER = "https://x.supabase.co/storage/v1/object/public/images/articles/a.webp";
const form = (f: Record<string, string>) => {
  const d = new FormData();
  Object.entries(f).forEach(([k, v]) => d.set(k, v));
  return d;
};
const good = { title: "كيف تختار اللون", body: "نص المقال", cover_url: COVER, is_published: "on" };

beforeEach(() => {
  vi.clearAllMocks();
  guard.requireAdmin.mockResolvedValue({ id: "admin" });
  db.write.mockResolvedValue({ error: null });
  db.del.mockResolvedValue({ error: null });
});

describe("saveArticleAction", () => {
  it("creates an article and goes back to the list", async () => {
    await expect(saveArticleAction(null, {}, form(good))).rejects.toThrow("REDIRECT:/admin/articles");
    expect(db.write).toHaveBeenCalledWith("insert", { title: "كيف تختار اللون", excerpt: null, body: "نص المقال", title_en: null, excerpt_en: null, body_en: null, cover_url: COVER, images: [], is_published: true });
  });
  it("updates by id", async () => {
    await expect(saveArticleAction(ID, {}, form(good))).rejects.toThrow("REDIRECT:/admin/articles");
    expect(db.write).toHaveBeenCalledWith("update", expect.objectContaining({ title: "كيف تختار اللون" }), "id", ID);
  });
  it("returns field errors and writes nothing for bad input", async () => {
    const r = await saveArticleAction(null, {}, form({ title: "", cover_url: "" }));
    expect(Object.keys(r.errors ?? {}).sort()).toEqual(["cover_url", "title"]);
    expect(db.write).not.toHaveBeenCalled();
  });
  it("hides database text on a failure, refuses a malformed id and non-admins", async () => {
    db.write.mockResolvedValue({ error: { message: "boom" } });
    expect((await saveArticleAction(null, {}, form(good))).error).toBe(ar.admin.errors.saveFailed);
    expect((await saveArticleAction("nope", {}, form(good))).error).toBe(ar.admin.errors.saveFailed);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveArticleAction(null, {}, form(good))).rejects.toThrow("REDIRECT:/admin/login");
  });
});

describe("toggleArticleAction and deleteArticleAction", () => {
  it("shows or hides an article", async () => {
    await expect(toggleArticleAction(ID, false)).rejects.toThrow("REDIRECT:/admin/articles");
    expect(db.write).toHaveBeenCalledWith("update", { is_published: false }, "id", ID);
  });
  it("deletes and returns to the list", async () => {
    await expect(deleteArticleAction(ID)).rejects.toThrow("REDIRECT:/admin/articles");
    expect(db.del).toHaveBeenCalledWith("id", ID);
  });
  it("refuses a bad id, reports a failure, and refuses non-admins", async () => {
    await expect(deleteArticleAction("nope")).rejects.toThrow(ar.admin.errors.saveFailed);
    await expect(toggleArticleAction("nope", true)).rejects.toThrow(ar.admin.errors.saveFailed);
    db.del.mockResolvedValue({ error: { message: "x" } });
    await expect(deleteArticleAction(ID)).rejects.toThrow(ar.admin.errors.saveFailed);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(deleteArticleAction(ID)).rejects.toThrow("REDIRECT:/admin/login");
    await expect(toggleArticleAction(ID, true)).rejects.toThrow("REDIRECT:/admin/login");
  });
});
