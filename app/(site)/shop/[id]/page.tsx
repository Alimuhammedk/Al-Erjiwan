import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { Gallery } from "@/components/shop/Gallery";
import { ProductPurchase } from "@/components/shop/ProductPurchase";
import { ar } from "@/content/ar";
import { getProductDetail } from "@/lib/data/shop";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getProductDetail(id);
  if (!detail) notFound();
  const { product, images } = detail;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6 pb-28 md:pb-6">
      <Breadcrumbs
        items={[
          { label: ar.nav[0].label, href: "/" },
          { label: ar.shop.title, href: "/shop" },
          { label: product.name_ar },
        ]}
      />
      <div className="grid gap-8 md:grid-cols-2">
        <Gallery images={images} alt={product.name_ar} />
        <div className="space-y-5">
          <h1 className="break-words text-3xl font-extrabold text-brand-900">{product.name_ar}</h1>
          {product.brand && (
            <p className="text-ink/70">
              {ar.product.brand}: <span className="font-semibold">{product.brand}</span>
            </p>
          )}
          {product.is_tintable && <p className="rounded-xl bg-brand-50 px-4 py-3 text-brand-700">{ar.product.tintNote}</p>}
          <ProductPurchase detail={detail} />
          <Link href="/calculator" className="inline-block font-bold text-brand-700 underline">
            {ar.product.notSure}
          </Link>
        </div>
      </div>
      {product.description && (
        <section className="max-w-3xl space-y-2">
          <h2 className="text-xl font-extrabold text-brand-900">{ar.product.description}</h2>
          <p className="whitespace-pre-line leading-8">{product.description}</p>
        </section>
      )}
    </main>
  );
}
