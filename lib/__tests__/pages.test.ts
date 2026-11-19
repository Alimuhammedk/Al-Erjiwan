import { beforeEach, describe, expect, it, vi } from "vitest";
import { ar } from "@/content/ar";
import { PAGE_MAX, PAGE_SLUGS, isPageSlug, pageIn, validatePage } from "../pages";

const e = ar.admin.errors;
const ok = { title_ar: " من نحن ", body_ar: "نص", title_en: "About", body_en: "Text" };

describe("isPageSlug", () => {
  it("knows the four pages and nothing else", () => {
    expect(PAGE_SLUGS).toEqual(["about", "faq", "returns", "privacy"]);
    for (const s of PAGE_SLUGS) expect(isPageSlug(s)).toBe(true);
    for (const s of ["contact", "", "About", "../etc", "about "]) expect(isPageSlug(s)).toBe(false);
  });
});

describe("validatePage", () => {
  it("accepts a page and cleans the text", () => {
    const r = validatePage("faq", ok);
    expect(r.ok && r.value).toEqual({ title_ar: "من نحن", title_en: "About", body_ar: "نص", body_en: "Text", map_url: null });
  });
  it("needs an Arabic title, but English text and the body may be empty", () => {
    expect(validatePage("faq", { ...ok, title_ar: "" })).toEqual({ ok: false, errors: { title_ar: e.required } });
    const r = validatePage("faq", { title_ar: "عنوان" });
    expect(r.ok && r.value).toMatchObject({ title_en: "", body_ar: "", body_en: "" });
  });
  it("keeps line breaks and refuses over-long text, naming the field", () => {
    const r = validatePage("faq", { ...ok, body_ar: "سطر 1\r\n\r\nسطر 2" });
    expect(r.ok && r.value.body_ar).toBe("سطر 1\n\nسطر 2");
    const bad = validatePage("faq", { title_ar: "ا".repeat(PAGE_MAX.title + 1), title_en: "a".repeat(PAGE_MAX.title + 1), body_ar: "ا".repeat(PAGE_MAX.body + 1), body_en: "a".repeat(PAGE_MAX.body + 1) });
    expect(bad.ok === false && Object.keys(bad.errors).sort()).toEqual(["body_ar", "body_en", "title_ar", "title_en"]);
  });
  it("the About page keeps a good map link (coordinates, address, embed code, short link) and refuses a bad one", () => {
    for (const map of ["32.2045, 44.3321", "https://www.google.com/maps/@32.2,44.3,15z", "https://maps.app.goo.gl/AbC123", '<iframe src="https://www.google.com/maps/embed?pb=!1m1"></iframe>']) {
      const r = validatePage("about", { ...ok, map_url: ` ${map} ` });
      expect(r.ok && r.value.map_url, map).toBe(map);
    }
    for (const map of ["https://evil.com/x", "javascript:alert(1)", "hello", "a".repeat(1001)]) {
      expect(validatePage("about", { ...ok, map_url: map }), map).toEqual({ ok: false, errors: { map_url: ar.admin.pages.badMap } });
    }
  });
  it("an empty map link means no map, and other pages never keep a map link", () => {
    expect(validatePage("about", { ...ok, map_url: "  " })).toMatchObject({ ok: true, value: { map_url: null } });
    expect(validatePage("faq", { ...ok, map_url: "32.2,44.3" })).toMatchObject({ ok: true, value: { map_url: null } });
    expect(validatePage("faq", { ...ok, map_url: "https://evil.com" }).ok).toBe(true);
  });
  it("treats missing values as empty, not as a crash", () => {
    expect(validatePage("about", {}).ok).toBe(false);
  });
});

describe("pageIn", () => {
  const page = { title_ar: "من نحن", title_en: "About us", body_ar: "نص عربي", body_en: "English text" };
  it("gives each language its own text", () => {
    expect(pageIn(page, "ar")).toEqual({ title: "من نحن", body: "نص عربي" });
    expect(pageIn(page, "en")).toEqual({ title: "About us", body: "English text" });
  });
  it("falls back to Arabic for whatever English is empty", () => {
    expect(pageIn({ ...page, title_en: "", body_en: "  " }, "en")).toEqual({ title: "من نحن", body: "نص عربي" });
    expect(pageIn({ ...page, body_en: "" }, "en")).toEqual({ title: "About us", body: "نص عربي" });
  });
});

// ---- the action ----
const db = vi.hoisted(() => ({ update: vi.fn() }));
const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/auth", () => guard);
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: async () => ({ from: () => ({ update: (v: unknown) => ({ eq: (c: string, s: string) => db.update(v, c, s) }) }) }),
}));
import { savePageAction } from "../../app/admin/(protected)/pages/actions";

const form = (f: Record<string, string>) => {
  const d = new FormData();
  Object.entries(f).forEach(([k, v]) => d.set(k, v));
  return d;
};

describe("savePageAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.requireAdmin.mockResolvedValue({ id: "admin" });
    db.update.mockResolvedValue({ error: null });
  });
  it("saves the page by name and goes back to the list", async () => {
    await expect(savePageAction("about", {}, form({ ...ok, map_url: "32.2,44.3" }))).rejects.toThrow("REDIRECT:/admin/pages");
    expect(db.update).toHaveBeenCalledWith({ title_ar: "من نحن", title_en: "About", body_ar: "نص", body_en: "Text", map_url: "32.2,44.3" }, "slug", "about");
  });
  it("refuses an unknown page and writes nothing", async () => {
    expect((await savePageAction("contact", {}, form(ok))).error).toBe(e.saveFailed);
    expect(db.update).not.toHaveBeenCalled();
  });
  it("returns field errors and writes nothing for bad input", async () => {
    const r = await savePageAction("about", {}, form({ title_ar: "", map_url: "https://evil.com" }));
    expect(Object.keys(r.errors ?? {}).sort()).toEqual(["map_url", "title_ar"]);
    expect(db.update).not.toHaveBeenCalled();
  });
  it("hides database text on a failure and refuses non-admins", async () => {
    db.update.mockResolvedValue({ error: { message: "boom" } });
    expect((await savePageAction("faq", {}, form(ok))).error).toBe(e.saveFailed);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(savePageAction("faq", {}, form(ok))).rejects.toThrow("REDIRECT:/admin/login");
  });
});
