import { createServerClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type ShopQuery } from "@/lib/shop/query";
import type { Colour, Product, ProductWithImage } from "@/types/db";
import { withFirstImage, type Row } from "./products";

// Shortcut: price filter and price sort use the product's base price; sized products are priced
// per size, so Ali enters the lowest size price as the base price (hint in the admin form).
export async function getShopProducts(q: ShopQuery): Promise<{ products: ProductWithImage[]; total: number }> {
  try {
    const db = createServerClient();
    if (!db) return { products: [], total: 0 };

    let query = db
      .from("products")
      .select("*, product_images(url, sort_order)", { count: "exact" })
      .eq("is_active", true);
    if (q.q) query = query.or(`name_ar.ilike.%${q.q}%,name_en.ilike.%${q.q}%`);
    if (q.category) query = query.eq("category_id", q.category);
    if (q.brand) query = query.eq("brand", q.brand);
    if (q.room) query = query.contains("rooms", [q.room]);
    if (q.finish) query = query.eq("finish", q.finish);
    if (q.min !== null) query = query.gte("base_price", q.min);
    if (q.max !== null) query = query.lte("base_price", q.max);

    query =
      q.sort === "price_asc"
        ? query.order("base_price", { ascending: true })
        : q.sort === "price_desc"
          ? query.order("base_price", { ascending: false })
          : query.order("created_at", { ascending: false });

    const from = (q.page - 1) * PAGE_SIZE;
    const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) return { products: [], total: 0 };
    return { products: ((data as Row[] | null) ?? []).map(withFirstImage), total: count ?? 0 };
  } catch {
    return { products: [], total: 0 };
  }
}

export async function getFilterOptions(): Promise<{
  categories: { id: string; name_ar: string }[];
  brands: string[];
}> {
  try {
    const db = createServerClient();
    if (!db) return { categories: [], brands: [] };
    const [cats, brands] = await Promise.all([
      db.from("categories").select("id, name_ar").order("sort_order"),
      db.from("products").select("brand").eq("is_active", true).not("brand", "is", null),
    ]);
    if (cats.error || brands.error) return { categories: [], brands: [] };
    const names = (brands.data as { brand: string }[] | null) ?? [];
    return {
      categories: (cats.data as { id: string; name_ar: string }[] | null) ?? [],
      brands: [...new Set(names.map((b) => b.brand))].sort(),
    };
  } catch {
    return { categories: [], brands: [] };
  }
}

export type ProductDetail = {
  product: Product;
  images: string[];
  variants: { id: string; size_label: string; price: number; stock: number; colour_id: string | null }[];
  colours: Colour[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// null for a malformed id, an unknown or hidden product, or any error, so the page can show "not found".
export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  if (!UUID.test(id)) return null;
  try {
    const db = createServerClient();
    if (!db) return null;

    const { data: product, error } = await db
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !product || !(product as Product).is_active) return null;

    const [images, variants] = await Promise.all([
      db.from("product_images").select("url, sort_order").eq("product_id", id).order("sort_order"),
      db.from("product_variants").select("*").eq("product_id", id).order("price"),
    ]);
    if (images.error || variants.error) return null;
    const vs = (variants.data as ProductDetail["variants"] | null) ?? [];

    // Tinted paint can be any palette colour; ready-made paint offers only the colours its sizes use.
    let colours: Colour[] = [];
    if ((product as Product).is_tintable) {
      const r = await db.from("colours").select("*").order("name_ar");
      if (!r.error) colours = (r.data as Colour[] | null) ?? [];
    } else {
      const ids = [...new Set(vs.map((v) => v.colour_id).filter((c): c is string => c !== null))];
      if (ids.length) {
        const r = await db.from("colours").select("*").in("id", ids);
        if (!r.error) colours = (r.data as Colour[] | null) ?? [];
      }
    }

    return {
      product: product as Product,
      images: ((images.data as { url: string }[] | null) ?? []).map((i) => i.url),
      variants: vs,
      colours,
    };
  } catch {
    return null;
  }
}
