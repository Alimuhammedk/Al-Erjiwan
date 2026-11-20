import Link from "next/link";
import { paragraphs } from "@/lib/articles";
import { faqItems, pageIn, type SitePage } from "@/lib/pages";
import type { Messages } from "@/lib/i18n/types";
import { StoreMap } from "./StoreMap";

// One of the four pages in the visitor's language. Used by the real pages and by the dev-only sample page.
export function PageView({ page, t }: { page: SitePage; t: Messages }) {
  const { title, body } = pageIn(page, t.lang);
  const parts = paragraphs(body);
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10" data-testid="page-view">
      <h1 className="break-words text-3xl font-extrabold leading-[1.5] text-brand-900 sm:text-4xl">{title}</h1>
      {parts.length === 0 ? (
        <p className="text-ink/70">{t.pages.emptyPage}</p>
      ) : (
        page.slug === "faq" ? (
          // Each question is its own row; its answer opens on tap. The answer opens when the question is tapped.
          <div className="divide-y divide-brand-100 rounded-2xl border border-brand-100 bg-white" data-testid="faq-list">
            {faqItems(parts).map((item, n) => (
              <details key={n} className="group px-4">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 text-lg font-bold text-brand-900 [&::-webkit-details-marker]:hidden">
                  <span className="break-words">{item.q}</span>
                  <span aria-hidden className="shrink-0 text-2xl leading-none text-brand-700 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="whitespace-pre-line break-words pb-4 text-lg leading-10 text-ink/90">{item.a}</p>
              </details>
            ))}
          </div>
        ) : (
          <div className="space-y-5 text-lg leading-10 text-ink/90">
            {parts.map((p, n) => (
              <p key={n} className="whitespace-pre-line break-words">
                {p}
              </p>
            ))}
          </div>
        )
      )}
      {page.slug === "about" && <StoreMap source={page.map_url} title={t.pages.mapTitle} openLabel={t.pages.openInMaps} />}
      <Link href="/" className="inline-flex min-h-11 items-center font-bold text-brand-700">
        {t.pages.back}
      </Link>
    </main>
  );
}
