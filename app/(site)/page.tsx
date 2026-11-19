import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ProductRow } from "@/components/home/ProductRow";
import { ArticlesSection } from "@/components/home/ArticlesSection";
import { CalculatorBanner } from "@/components/home/CalculatorBanner";
import { TrustStrip } from "@/components/shop/TrustStrip";
import { ar } from "@/content/ar";
import { getBanners } from "@/lib/data/banners";
import { getHomeArticles } from "@/lib/data/articles";
import { getCategories } from "@/lib/data/categories";
import { getFeaturedProducts, getSaleProducts } from "@/lib/data/products";

// Render on every request so admin changes show instantly.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [banners, categories, featured, offers, articles] = await Promise.all([
    getBanners(),
    getCategories(),
    getFeaturedProducts(),
    getSaleProducts(),
    getHomeArticles(),
  ]);

  return (
    <main className="flex-1">
      <HeroSlider banners={banners} />
      <CategoryGrid categories={categories} />
      <ProductRow title={ar.home.bestSellersTitle} products={featured} emptyMessage={ar.home.emptyBestSellers} />
      <ProductRow title={ar.home.offersTitle} products={offers} emptyMessage={ar.home.emptyOffers} />
      <ArticlesSection articles={articles} />
      <CalculatorBanner />
      {/* Last thing before the footer */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-12">
        <TrustStrip className="sm:grid-cols-3" />
      </section>
    </main>
  );
}
