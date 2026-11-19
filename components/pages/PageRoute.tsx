import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/data/pages";
import { getMessages } from "@/lib/i18n/messages";
import { cardExcerpt } from "@/lib/articles";
import { pageIn, type PageSlug } from "@/lib/pages";
import { PageView } from "./PageView";

// The shared body of the four page routes (about, faq, returns, privacy).
export async function PageRoute({ slug }: { slug: PageSlug }) {
  const [t, page] = await Promise.all([getMessages(), getPage(slug)]);
  if (!page) notFound();
  return <PageView page={page} t={t} />;
}

export async function pageMetadata(slug: PageSlug): Promise<Metadata> {
  const [t, page] = await Promise.all([getMessages(), getPage(slug)]);
  if (!page) return { title: `${t.pages.notFound} | ${t.siteName}`, robots: { index: false } };
  const { title, body } = pageIn(page, t.lang);
  return { title: `${title} | ${t.siteName}`, description: cardExcerpt({ excerpt: null, body }, 160) };
}
