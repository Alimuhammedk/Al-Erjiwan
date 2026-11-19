import { ar } from "@/content/ar";
import type { Result } from "@/lib/admin/types";
import { isImageUrl } from "@/lib/admin/validate";

export type Article = {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_url: string;
  images: string[];
  is_published: boolean;
  published_at: string;
  updated_at: string;
};

export type ArticleInput = {
  title: string;
  excerpt: string | null;
  body: string;
  cover_url: string;
  images: string[];
  is_published: boolean;
};

export const ARTICLE_MAX = { title: 150, excerpt: 300, body: 20000, images: 6 } as const;

type Raw = Record<string, FormDataEntryValue | null | undefined>;
const e = ar.admin.errors;
const str = (v: Raw[string]) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "");

// An article typed in the admin. The cover is required; extra pictures come as a JSON list in a hidden field.
export function validateArticle(raw: Raw): Result<ArticleInput> {
  const errors: Record<string, string> = {};

  const title = str(raw.title);
  if (title.length < 2) errors.title = e.required;
  else if (title.length > ARTICLE_MAX.title) errors.title = e.tooLong;

  const excerpt = str(raw.excerpt);
  if (excerpt.length > ARTICLE_MAX.excerpt) errors.excerpt = e.tooLong;

  const body = str(raw.body);
  if (body.length > ARTICLE_MAX.body) errors.body = e.tooLong;

  const cover_url = str(raw.cover_url);
  if (!cover_url) errors.cover_url = e.required;
  else if (!isImageUrl(cover_url)) errors.cover_url = e.invalidImage;

  let images: string[] = [];
  const list = str(raw.images);
  if (list) {
    try {
      const data: unknown = JSON.parse(list);
      if (!Array.isArray(data) || data.some((u) => typeof u !== "string" || !isImageUrl(u))) errors.images = e.invalidImage;
      else if (data.length > ARTICLE_MAX.images) errors.images = e.tooManyImages;
      else images = data as string[];
    } catch {
      errors.images = e.invalidImage;
    }
  }

  const published = raw.is_published === "on" || raw.is_published === "true";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title, excerpt: excerpt || null, body, cover_url, images, is_published: published } };
}

// The body is plain text; a blank line starts a new paragraph.
export function paragraphs(body: string): string[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// The short text on a card: the written excerpt, or the start of the body cut at a word.
export function cardExcerpt(a: Pick<Article, "excerpt" | "body">, max = 140): string {
  const own = a.excerpt?.trim();
  if (own) return own;
  const flat = a.body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).trimEnd()}…`;
}
