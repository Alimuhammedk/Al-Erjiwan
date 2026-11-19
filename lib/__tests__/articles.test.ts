import { describe, expect, it } from "vitest";
import { ar } from "@/content/ar";
import { ARTICLE_MAX, cardExcerpt, paragraphs, validateArticle } from "../articles";

const e = ar.admin.errors;
const COVER = "https://x.supabase.co/storage/v1/object/public/images/articles/a.webp";
const ok = { title: " كيف تختار اللون ", cover_url: COVER, body: "نص", is_published: "on" };

describe("validateArticle", () => {
  it("accepts a minimal article and cleans the text", () => {
    const r = validateArticle(ok);
    expect(r.ok && r.value).toEqual({ title: "كيف تختار اللون", excerpt: null, body: "نص", cover_url: COVER, images: [], is_published: true });
  });
  it("keeps the excerpt, line breaks in the body, extra pictures, and an unticked switch means a draft", () => {
    const r = validateArticle({ ...ok, excerpt: " ملخص ", body: "فقرة 1\r\n\r\nفقرة 2", images: JSON.stringify([COVER, "/seed/p1.png"]), is_published: undefined });
    expect(r.ok && r.value).toMatchObject({ excerpt: "ملخص", body: "فقرة 1\n\nفقرة 2", images: [COVER, "/seed/p1.png"], is_published: false });
  });
  it("needs a title of 2 letters and a cover picture", () => {
    expect(validateArticle({ ...ok, title: "ع" })).toMatchObject({ ok: false, errors: { title: e.required } });
    expect(validateArticle({ ...ok, cover_url: "" })).toMatchObject({ ok: false, errors: { cover_url: e.required } });
  });
  it("refuses a cover or extra picture that is not an https or site address", () => {
    expect(validateArticle({ ...ok, cover_url: "javascript:alert(1)" })).toMatchObject({ ok: false, errors: { cover_url: e.invalidImage } });
    expect(validateArticle({ ...ok, cover_url: "//evil.com/x.png" })).toMatchObject({ ok: false, errors: { cover_url: e.invalidImage } });
    expect(validateArticle({ ...ok, images: JSON.stringify(["http://x.com/a.png"]) })).toMatchObject({ ok: false, errors: { images: e.invalidImage } });
    expect(validateArticle({ ...ok, images: JSON.stringify([5]) })).toMatchObject({ ok: false, errors: { images: e.invalidImage } });
    expect(validateArticle({ ...ok, images: "{bad" })).toMatchObject({ ok: false, errors: { images: e.invalidImage } });
  });
  it("allows at most 6 extra pictures", () => {
    expect(validateArticle({ ...ok, images: JSON.stringify(Array(6).fill(COVER)) }).ok).toBe(true);
    expect(validateArticle({ ...ok, images: JSON.stringify(Array(7).fill(COVER)) })).toMatchObject({ ok: false, errors: { images: e.tooManyImages } });
  });
  it("refuses over-long text, naming the field", () => {
    const r = validateArticle({ ...ok, title: "ا".repeat(ARTICLE_MAX.title + 1), excerpt: "ا".repeat(ARTICLE_MAX.excerpt + 1), body: "ا".repeat(ARTICLE_MAX.body + 1) });
    expect(r.ok === false && Object.keys(r.errors).sort()).toEqual(["body", "excerpt", "title"]);
  });
  it("treats missing values as empty, not as a crash", () => {
    expect(validateArticle({}).ok).toBe(false);
  });
});

describe("paragraphs", () => {
  it("splits on blank lines, trims and drops empty ones", () => {
    expect(paragraphs("  أول  \n\n\n ثان\nسطر داخل الفقرة \n\n   \n")).toEqual(["أول", "ثان\nسطر داخل الفقرة"]);
    expect(paragraphs("a\r\n\r\nb")).toEqual(["a", "b"]);
    expect(paragraphs("")).toEqual([]);
  });
});

describe("cardExcerpt", () => {
  it("uses the written excerpt when there is one", () => {
    expect(cardExcerpt({ excerpt: " ملخص ", body: "نص طويل" })).toBe("ملخص");
  });
  it("otherwise cuts the start of the body at a word, with an ellipsis, and leaves short text alone", () => {
    expect(cardExcerpt({ excerpt: null, body: "نص قصير" })).toBe("نص قصير");
    const long = "كلمة ".repeat(60);
    const r = cardExcerpt({ excerpt: "", body: long }, 50);
    expect(r.endsWith("…")).toBe(true);
    expect(r.length).toBeLessThanOrEqual(51);
    expect(r).not.toMatch(/\s…$/);
  });
  it("handles an empty body", () => {
    expect(cardExcerpt({ excerpt: null, body: "" })).toBe("");
  });
});
