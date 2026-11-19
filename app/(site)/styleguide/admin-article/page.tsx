import { notFound } from "next/navigation";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { echoSaveArticle } from "./echo-actions";

// Dev-only copy of the article form (real checks, nothing is saved). Remove before launch.
export default function AdminArticleHarness() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <ArticleForm action={echoSaveArticle} />
    </main>
  );
}
