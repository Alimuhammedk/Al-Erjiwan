import { localised } from "@/lib/i18n/lang";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { Gallery } from "@/components/shop/Gallery";
import { ProductPurchase } from "@/components/shop/ProductPurchase";
import { getMessages } from "@/lib/i18n/messages";
import { getProductDetail } from "@/lib/data/shop";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const m = await getMessages();
  const { id } = await params;
  const detail = await getProductDetail(id);
  if (!detail) notFound();
  const { product, images } = detail;
  const name = localised(m.lang, product.name_ar, product.name_en);
  const description = localised(m.lang, product.description, product.description_en);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6 pb-28 md:pb-6">
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
