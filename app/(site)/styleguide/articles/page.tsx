import { notFound } from "next/navigation";
import { ArticleView } from "@/components/home/ArticleView";
import { ArticlesSection } from "@/components/home/ArticlesSection";
import type { Article } from "@/lib/articles";

// Dev-only copy of the articles section (?empty=1 for none, ?one=1 for a single article) and of the article page
// (?view=article), with sample articles. Remove before launch.
const make = (n: number, title: string, body: string, excerpt: string | null, cover: string): Article => ({
  id: `123e4567-e89b-12d3-a456-4266141740${String(n).padStart(2, "0")}`,
  title,
  excerpt,
  body,
  cover_url: cover,
  images: n === 1 ? ["/seed/p2.png", "/seed/p3.png"] : [],
  is_published: true,
  published_at: `2026-11-${String(20 - n).padStart(2, "0")}T10:00:00Z`,
  updated_at: "2026-11-20T10:00:00Z",
});
const SAMPLE: Article[] = [
  make(1, "كيف تختار لون غرفة المعيشة بثقة", "الألوان الفاتحة تجعل الغرفة أوسع.\n\nجرّب العينة على الجدار قبل أن تشتري الكمية كاملة، وانظر إليها صباحًا ومساءً.\n\nلا تنسَ السقف والأبواب.", "ثلاث خطوات بسيطة تختصر عليك الحيرة وتحميك من الندم.", "/seed/b1.png"),
  make(2, "الفرق بين الدهان المطفي واللامع", "المطفي يخفي عيوب الجدار، واللامع أسهل في التنظيف. اختر حسب الغرفة وحسب كثرة الاستخدام.", null, "/seed/b2.png"),
  make(3, "كم لترًا تحتاج لغرفة 4×3 متر؟", "احسب مساحة الجدران، اطرح الأبواب والنوافذ، واضرب في عدد الطبقات. تقريبًا لتر واحد يكفي عشرة أمتار مربعة للطبقة الواحدة.", "طريقة سريعة لتقدير الكمية قبل أن تطلب.", "/seed/b3.png"),
  make(4, "تجهيز الجدار قبل الدهان: خطوات لا تتجاوزها", "نظّف الجدار، سُدّ الشقوق، وضع طبقة أساس. التحضير الجيد يمنحك دهانًا يدوم سنوات.", "التحضير الجيد نصف النتيجة.", "/seed/c1.png"),
];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ArticlesHarness({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const p = await searchParams;
  if (first(p.view) === "article") return <ArticleView article={SAMPLE[0]} />;
  const list = first(p.empty) ? [] : first(p.one) ? SAMPLE.slice(0, 1) : SAMPLE;
  return (
    <main className="flex-1 pb-12">
      <ArticlesSection articles={list} />
    </main>
  );
}
