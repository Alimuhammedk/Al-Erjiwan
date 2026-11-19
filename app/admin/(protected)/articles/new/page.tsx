import { ArticleForm } from "@/components/admin/ArticleForm";
import { ar } from "@/content/ar";
import { saveArticleAction } from "../actions";

export default function NewArticlePage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.add} · {ar.admin.articles.title}
      </h1>
      <ArticleForm action={saveArticleAction.bind(null, null)} />
    </main>
  );
}
