import Image from "next/image";
import Link from "next/link";
import { PagesList } from "@/components/admin/PagesList";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ar } from "@/content/ar";
import { listAdminArticles } from "@/lib/admin/articles-data";
import { formatDate } from "@/lib/format";
import { deleteArticleAction, toggleArticleAction } from "./actions";

export const dynamic = "force-dynamic";
const t = ar.admin.articles;

export default async function AdminArticlesPage() {
  const articles = await listAdminArticles();
  const btn = "inline-flex min-h-10 items-center rounded-full border-2 border-brand-700 px-4 text-sm font-bold text-brand-700";
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900">
          {t.title} <span className="text-base font-normal text-ink/70">({articles.length})</span>
        </h1>
        <Link href="/admin/articles/new" className="inline-flex min-h-11 items-center rounded-full bg-brand-700 px-5 font-bold text-white">
          {ar.admin.add}
        </Link>
      </div>
      {articles.length === 0 ? (
        <p className="rounded-2xl bg-paper p-8 text-center text-brand-700">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-brand-100 rounded-2xl bg-paper">
          {articles.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                <Image src={a.cover_url} alt="" fill sizes="96px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words font-bold text-brand-900">{a.title}</p>
                <p className="text-sm text-ink/60">{formatDate(a.published_at)}</p>
              </div>
              <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${a.is_published ? "bg-emerald-600 text-white" : "bg-ink/70 text-white"}`}>
                {a.is_published ? ar.admin.products.active : t.draft}
              </span>
              <form action={toggleArticleAction.bind(null, a.id, !a.is_published)}>
                <button type="submit" className={btn}>
                  {a.is_published ? t.hide : t.show}
                </button>
              </form>
              {a.is_published && (
                <Link href={`/articles/${a.id}`} className={btn}>
                  {t.view}
                </Link>
              )}
              <Link href={`/admin/articles/${a.id}`} className={btn}>
                {ar.admin.edit}
              </Link>
              <DeleteButton action={deleteArticleAction.bind(null, a.id)} />
            </li>
          ))}
        </ul>
      )}
      <PagesList />
    </main>
  );
}
