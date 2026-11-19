import { localised } from "@/lib/i18n/lang";
import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { Gallery } from "@/components/shop/Gallery";
import { ProductPurchase } from "@/components/shop/ProductPurchase";
import { getMessages } from "@/lib/i18n/messages";
import { getProductDetail } from "@/lib/data/shop";
import { cardExcerpt } from "@/lib/articles";
import { jsonLdScript, productJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Loaded once per request, shared by the page and its title.
const load = cache(getProductDetail);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const m = await getMessages();
  const detail = await load((await params).id);
  if (!detail) return { title: `${m.product.notFoundTitle} | ${m.siteName}`, robots: { index: false } };
  const { product, images } = detail;
  const name = localised(m.lang, product.name_ar, product.name_en);
  const text = localised(m.lang, product.description, product.description_en);
  const description = text ? cardExcerpt({ excerpt: null, body: text }, 160) : `${name} | ${m.tagline}`;
  return {
    title: `${name} | ${m.siteName}`,
    description,
    alternates: { canonical: `/shop/${product.id}` },
    openGraph: { type: "website", title: name, description, ...(images[0] ? { images: [{ url: images[0] }] } : {}) },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const m = await getMessages();
  const { id } = await params;
  const detail = await load(id);
  if (!detail) notFound();
  const { product, images } = detail;
  const name = localised(m.lang, product.name_ar, product.name_en);
  const description = localised(m.lang, product.description, product.description_en);
  const jsonLd = productJsonLd({
    id: product.id,
    name,
    description,
    brand: product.brand,
    image: images[0] ?? null,
    base_price: product.base_price,
    sale_price: product.sale_price,
    stock: product.stock,
    variants: detail.variants,
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6 pb-28 md:pb-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <Breadcrumbs
        items={[
          { label: m.nav[0].label, href: "/" },
          { label: m.shop.title, href: "/shop" },
          { label: name },
        ]}
      />
      <div className="grid gap-8 md:grid-cols-2">
        <Gallery images={images} alt={name} />
        <div className="space-y-5">
          <h1 className="break-words text-3xl font-extrabold text-brand-900">{name}</h1>
          {product.brand && (
            <p className="text-ink/70">
              {m.product.brand}: <span className="font-semibold">{product.brand}</span>
            </p>
          )}
          {product.is_tintable && <p className="rounded-xl bg-brand-50 px-4 py-3 text-brand-700">{m.product.tintNote}</p>}
          <ProductPurchase detail={detail} />
          <Link href="/calculator" className="inline-block font-bold text-brand-700 underline">
            {m.product.notSure}
          </Link>
        </div>
      </div>
      {description && (
        <section className="max-w-3xl space-y-2">
          <h2 className="text-xl font-extrabold text-brand-900">{m.product.description}</h2>
          <p className="whitespace-pre-line leading-8">{description}</p>
        </section>
      )}
    </main>
  );
}
