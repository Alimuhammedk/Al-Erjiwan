import Image from "next/image";
import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";
import { articleIn, paragraphs, type Article } from "@/lib/articles";
import { formatDate } from "@/lib/format";


// One article, full page: the cover, the title and date, the text in paragraphs, and any extra pictures.
// Used by the real page and by the dev-only sample page.
export async function ArticleView({ article }: { article: Article }) {
  const m = await getMessages();
  const text = articleIn(article, m.lang);
  const t = m.articles;
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8" data-testid="article-view">
      <Link href="/" className="inline-flex min-h-11 items-center font-bold text-brand-700">
        <span aria-hidden="true" className="inline-block ltr:rotate-180">
          →
        </span>{" "}
        {t.back}
      </Link>

      <header className="space-y-3">
        <time dateTime={article.published_at} className="inline-block rounded-full bg-sun-300 px-3 py-1 text-xs font-extrabold text-brand-900">
          {formatDate(article.published_at, m.lang)}
        </time>
        <h1 className="break-words text-3xl font-extrabold leading-[1.5] text-brand-900 sm:text-4xl">{text.title}</h1>
        {text.excerpt && <p className="text-lg leading-9 text-ink/75">{text.excerpt}</p>}
      </header>

      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-brand-50">
        <Image src={article.cover_url} alt="" fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
      </div>

      <div className="space-y-5 text-lg leading-10 text-ink/90">
        {paragraphs(text.body).map((p, n) => (
          <p key={n} className="whitespace-pre-line break-words">
            {p}
          </p>
        ))}
      </div>

      {article.images.length > 0 && (
        <div className={`grid gap-3 ${article.images.length === 1 ? "" : "sm:grid-cols-2"}`}>
          {article.images.map((src, n) => (
            <div key={`${src}-${n}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand-50">
              <Image src={src} alt="" fill sizes="(min-width: 768px) 380px, 100vw" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-brand-100 pt-6">
        <Link href="/shop" className="inline-flex min-h-12 items-center rounded-full bg-brand-700 px-7 font-bold text-white hover:bg-brand-900">
          {t.shop}
        </Link>
        <Link href="/" className="inline-flex min-h-12 items-center rounded-full border-2 border-brand-700 px-7 font-bold text-brand-700 hover:bg-brand-50">
          {t.back}
        </Link>
      </div>
    </main>
  );
}
