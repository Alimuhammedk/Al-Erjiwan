import { notFound } from "next/navigation";
import { PageView } from "@/components/pages/PageView";
import { getMessages } from "@/lib/i18n/messages";
import { isPageSlug, type SitePage } from "@/lib/pages";

// Dev-only copy of the four pages with sample text (?slug=faq, ?map=<link or coordinates>, ?english=0 for no English
// text). Remove before launch.
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function PagesHarness({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const p = await searchParams;
  const slug = isPageSlug(first(p.slug)) ? (first(p.slug) as SitePage["slug"]) : "about";
  const english = first(p.english) !== "0";
  const page: SitePage = {
    slug,
    title_ar: "من نحن",
    title_en: english ? "About us" : "",
    body_ar: "أصباغ الأرجوان متجر للدهانات في الكفل.\n\nنوصّل إلى جميع المحافظات.",
    body_en: english ? "Al-Erjiwan is a paint shop in Al-Kifl.\n\nWe deliver to every governorate." : "",
    map_url: first(p.map) || null,
    updated_at: "2026-11-20T10:00:00Z",
  };
  return <PageView page={page} t={await getMessages()} />;
}
