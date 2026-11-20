import { createServerClient } from "@/lib/supabase/server";
import type { Product, ProductImage, ProductWithImage } from "@/types/db";

export type Row = Product & { product_images: Pick<ProductImage, "url" | "sort_order">[] | null };

export function withFirstImage(row: Row): ProductWithImage {
  const { product_images, ...product } = row;
  const [first, second] = [...(product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return { ...product, image_url: first?.url ?? null, hover_image_url: second?.url ?? null };
}

async function activeProducts(filter: "is_featured" | "sale_price"): Promise<ProductWithImage[]> {
  try {
    const db = createServerClient({ cached: true });
    if (!db) return [];
    let query = db
      .from("products")
      .select("*, product_images(url, sort_order)")
      .eq("is_active", true);
    query = filter === "is_featured" ? query.eq("is_featured", true) : query.not("sale_price", "is", null);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(8);
    return error ? [] : ((data as Row[] | null) ?? []).map(withFirstImage);
  } catch {
    return [];
  }
}

export const getFeaturedProducts = () => activeProducts("is_featured");
export const getSaleProducts = () => activeProducts("sale_price");
