import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ProductRow } from "@/components/home/ProductRow";
import { ArticlesSection } from "@/components/home/ArticlesSection";
import { CalculatorBanner } from "@/components/home/CalculatorBanner";
import { TrustStrip } from "@/components/shop/TrustStrip";
import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/messages";
import { jsonLdScript, organizationJsonLd } from "@/lib/seo";
import { storeInfo } from "@/lib/store-info";
import { getBanners } from "@/lib/data/banners";
import { getHomeArticles } from "@/lib/data/articles";
import { getCategories } from "@/lib/data/categories";
import { getFeaturedProducts, getSaleProducts } from "@/lib/data/products";

// Render on every request so admin changes show instantly.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const m = await getMessages();
  const [banners, categories, featured, offers, articles] = await Promise.all([
    getBanners(),
    getCategories(),
    getFeaturedProducts(),
    getSaleProducts(),
    getHomeArticles(),
  ]);

  return (
    <main className="flex-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd(m.siteName, m.common.storeAddress, storeInfo.phoneDisplay)) }} />
      <HeroSlider banners={banners} />
      <CategoryGrid categories={categories} />
      <ProductRow title={m.home.bestSellersTitle} products={featured} emptyMessage={m.home.emptyBestSellers} />
      <ProductRow title={m.home.offersTitle} products={offers} emptyMessage={m.home.emptyOffers} />
      <ArticlesSection articles={articles} />
      <CalculatorBanner />
      {/* Last thing before the footer */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-12">
        <TrustStrip />
      </section>
    </main>
  );
}
