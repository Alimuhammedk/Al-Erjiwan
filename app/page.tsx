import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ProductRow } from "@/components/home/ProductRow";
import { ProjectsPreview } from "@/components/home/ProjectsPreview";
import { ar } from "@/content/ar";
import { getBanners } from "@/lib/data/banners";
import { getCategories } from "@/lib/data/categories";
import { getFeaturedProducts, getSaleProducts } from "@/lib/data/products";

// Render on every request so admin changes show instantly.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [banners, categories, featured, offers] = await Promise.all([
    getBanners(),
    getCategories(),
    getFeaturedProducts(),
    getSaleProducts(),
  ]);

  return (
    <main className="flex-1">
      <HeroSlider banners={banners} />
      <CategoryGrid categories={categories} />
      <ProductRow title={ar.home.bestSellersTitle} products={featured} emptyMessage={ar.home.emptyBestSellers} />
      <ProductRow title={ar.home.offersTitle} products={offers} emptyMessage={ar.home.emptyOffers} />
      <ProjectsPreview />
    </main>
  );
}
