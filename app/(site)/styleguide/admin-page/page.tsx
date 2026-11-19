import { notFound } from "next/navigation";
import { PageForm } from "@/components/admin/PageForm";
import type { SitePage } from "@/lib/pages";
import { echoSavePage } from "./echo-actions";

// Dev-only copy of the page form (?slug=faq for a page without a map). Real checks, nothing saved. Remove before launch.
export default async function AdminPageHarness({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const slug = (await searchParams).slug === "faq" ? "faq" : "about";
  const page: SitePage = { slug, title_ar: "من نحن", title_en: "About us", body_ar: "نص عربي", body_en: "English text", map_url: null, updated_at: "2026-11-20T10:00:00Z" };
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <PageForm page={page} action={echoSavePage.bind(null, slug)} />
    </main>
  );
}
