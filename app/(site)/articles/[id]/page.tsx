import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/home/ArticleView";
import { ar } from "@/content/ar";
import { getArticle } from "@/lib/data/articles";
import { cardExcerpt } from "@/lib/articles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const article = await getArticle((await params).id);
  return article
    ? { title: `${article.title} | ${ar.siteName}`, description: cardExcerpt(article, 160) }
    : { title: `${ar.articles.notFound} | ${ar.siteName}`, robots: { index: false } };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const article = await getArticle((await params).id);
  if (!article) notFound();
  return <ArticleView article={article} />;
}
