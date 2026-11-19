import { notFound } from "next/navigation";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { ar } from "@/content/ar";
import { getAdminArticle } from "@/lib/admin/articles-data";
import { saveArticleAction } from "../actions";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getAdminArticle(id);
  if (!article) notFound();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.edit} · {article.title}
      </h1>
      <ArticleForm action={saveArticleAction.bind(null, id)} initial={article} />
    </main>
  );
}
