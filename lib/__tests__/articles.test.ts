import { describe, expect, it } from "vitest";
import { ar } from "@/content/ar";
import { ARTICLE_MAX, articleIn, cardExcerpt, paragraphs, validateArticle, type Article } from "../articles";

const e = ar.admin.errors;
const COVER = "https://x.supabase.co/storage/v1/object/public/images/articles/a.webp";
const ok = { title: " كيف تختار اللون ", cover_url: COVER, body: "نص", is_published: "on" };

describe("validateArticle", () => {
  it("accepts a minimal article and cleans the text", () => {
    const r = validateArticle(ok);
    expect(r.ok && r.value).toEqual({ title: "كيف تختار اللون", excerpt: null, body: "نص", title_en: null, excerpt_en: null, body_en: null, cover_url: COVER, images: [], is_published: true });
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

describe("the English boxes of an article", () => {
  it("are kept trimmed and empty ones become nothing", () => {
    const r = validateArticle({ ...ok, title_en: " How to choose ", excerpt_en: " Short ", body_en: " Para 1\r\n\r\nPara 2 " });
    expect(r.ok && r.value).toMatchObject({ title_en: "How to choose", excerpt_en: "Short", body_en: "Para 1\n\nPara 2" });
    expect(validateArticle({ ...ok, title_en: "  ", excerpt_en: "", body_en: "" }).ok && true).toBe(true);
    const empty = validateArticle({ ...ok, title_en: "  " });
    expect(empty.ok && empty.value.title_en).toBeNull();
  });
  it("refuse over-long English text, naming the field", () => {
    const r = validateArticle({ ...ok, title_en: "a".repeat(151), excerpt_en: "a".repeat(301), body_en: "a".repeat(20001) });
    expect(r.ok === false && Object.keys(r.errors).sort()).toEqual(["body_en", "excerpt_en", "title_en"]);
  });
});

describe("articleIn", () => {
  const base: Article = {
    id: "1", title: "عنوان", excerpt: "ملخص", body: "نص", title_en: "Title", excerpt_en: "Summary", body_en: "Text",
    cover_url: "x", images: [], is_published: true, published_at: "", updated_at: "",
  };
  it("gives the Arabic in Arabic and the English in English", () => {
    expect(articleIn(base, "ar")).toEqual({ title: "عنوان", excerpt: "ملخص", body: "نص" });
    expect(articleIn(base, "en")).toEqual({ title: "Title", excerpt: "Summary", body: "Text" });
  });
  it("falls back to Arabic for each field that has no English", () => {
    expect(articleIn({ ...base, title_en: "", body_en: null }, "en")).toMatchObject({ title: "عنوان", body: "نص" });
    expect(articleIn({ ...base, title_en: null, excerpt_en: null, body_en: null }, "en")).toEqual({ title: "عنوان", excerpt: "ملخص", body: "نص" });
  });
  it("does not show the Arabic summary next to English text: the card takes the start of the English text instead", () => {
    const r = articleIn({ ...base, excerpt_en: null }, "en");
    expect(r.excerpt).toBeNull();
    expect(cardExcerpt(r)).toBe("Text");
  });
});
