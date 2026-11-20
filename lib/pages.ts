import { ar } from "@/content/ar";
import type { Result } from "@/lib/admin/types";
import { localised } from "@/lib/i18n/lang";
import { parseMapLocation } from "@/lib/maps";

export const PAGE_SLUGS = ["about", "faq", "returns"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];
export const isPageSlug = (v: string): v is PageSlug => (PAGE_SLUGS as readonly string[]).includes(v);

export const PAGE_MAX = { title: 150, body: 20000, map: 1000 } as const;

export type SitePage = {
  slug: PageSlug;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  map_url: string | null;
  updated_at: string;
};

export type PageInput = { title_ar: string; title_en: string; body_ar: string; body_en: string; map_url: string | null };

type Raw = Record<string, FormDataEntryValue | null | undefined>;
const e = ar.admin.errors;
const str = (v: Raw[string]) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "");

// A page typed in the admin, in both languages. Only the About page has a map; a map link that is not a Google Maps
// address is refused with a message that says what to paste.
export function validatePage(slug: PageSlug, raw: Raw): Result<PageInput> {
  const errors: Record<string, string> = {};
  const field = (key: "title_ar" | "title_en" | "body_ar" | "body_en", max: number) => {
    const v = str(raw[key]);
    if (v.length > max) errors[key] = e.tooLong;
    return v;
  };
  const title_ar = field("title_ar", PAGE_MAX.title);
  if (!title_ar) errors.title_ar = e.required;
  const title_en = field("title_en", PAGE_MAX.title);
  const body_ar = field("body_ar", PAGE_MAX.body);
  const body_en = field("body_en", PAGE_MAX.body);

  let map_url: string | null = null;
  const map = str(raw.map_url);
  if (slug === "about" && map) {
    if (map.length > PAGE_MAX.map || !parseMapLocation(map)) errors.map_url = ar.admin.pages.badMap;
    else map_url = map;
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title_ar, title_en, body_ar, body_en, map_url } };
}

// The title and text of a page in a language; each falls back to Arabic when the English is empty.
export function pageIn(page: Pick<SitePage, "title_ar" | "title_en" | "body_ar" | "body_en">, lang: string): { title: string; body: string } {
  return { title: localised(lang, page.title_ar, page.title_en), body: localised(lang, page.body_ar, page.body_en) };
}

// FAQ text as question and answer pairs. A paragraph with a line break is one pair (first line = question, the rest =
// answer); plain paragraphs are taken two at a time (question, then answer).
export function faqItems(parts: string[]): { q: string; a: string }[] {
  const items: { q: string; a: string }[] = [];
  for (let i = 0; i < parts.length; i++) {
    const [first, ...rest] = parts[i].split("\n");
    if (rest.length) items.push({ q: first.trim(), a: rest.join("\n").trim() });
    else {
      items.push({ q: first.trim(), a: parts[i + 1] && !parts[i + 1].includes("\n") ? parts[i + 1] : "" });
      if (parts[i + 1] && !parts[i + 1].includes("\n")) i++;
    }
  }
  return items;
}
