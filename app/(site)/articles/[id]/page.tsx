import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/home/ArticleView";
import { getMessages } from "@/lib/i18n/messages";
import { getArticle } from "@/lib/data/articles";
import { articleIn, cardExcerpt } from "@/lib/articles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const m = await getMessages();
  const article = await getArticle((await params).id);
  return article
    ? { title: `${articleIn(article, m.lang).title} | ${m.siteName}`, description: cardExcerpt(articleIn(article, m.lang), 160), alternates: { canonical: `/articles/${article.id}` }, openGraph: { type: "article", title: articleIn(article, m.lang).title, images: [{ url: article.cover_url }] } }
    : { title: `${m.articles.notFound} | ${m.siteName}`, robots: { index: false } };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const article = await getArticle((await params).id);
  if (!article) notFound();
  return <ArticleView article={article} />;
}
