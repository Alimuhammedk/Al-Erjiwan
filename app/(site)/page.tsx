import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ProductRow } from "@/components/home/ProductRow";
import { CalculatorBanner } from "@/components/home/CalculatorBanner";
import { ShopInfo } from "@/components/home/ShopInfo";
import { TrustStrip } from "@/components/shop/TrustStrip";
import { ar } from "@/content/ar";
import { getBanners } from "@/lib/data/banners";
import { getCategories } from "@/lib/data/categories";
import { getStoreSettings } from "@/lib/data/store-settings";
import { getFeaturedProducts, getSaleProducts } from "@/lib/data/products";

// Render on every request so admin changes show instantly.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [banners, categories, featured, offers, settings] = await Promise.all([
    getBanners(),
    getCategories(),
    getFeaturedProducts(),
    getSaleProducts(),
    getStoreSettings(),
  ]);

  return (
    <main className="flex-1">
      <HeroSlider banners={banners} />
      <CategoryGrid categories={categories} />
      <ProductRow title={ar.home.bestSellersTitle} products={featured} emptyMessage={ar.home.emptyBestSellers} />
      <ProductRow title={ar.home.offersTitle} products={offers} emptyMessage={ar.home.emptyOffers} />
      <CalculatorBanner />
      <ShopInfo settings={settings} />
      {/* Last thing before the footer */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-12">
        <TrustStrip className="sm:grid-cols-3" />
      </section>
    </main>
  );
}
