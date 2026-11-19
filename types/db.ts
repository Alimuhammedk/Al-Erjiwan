// Row types matching SPEC.md section 5. Keep in sync with supabase/migrations.
export type Banner = {
  id: string;
  image_url: string;
  title: string | null;
  link: string | null;
  sort_order: number;
  is_active: boolean;
};

export type Category = {
  id: string;
  name_ar: string;
  name_en: string | null;
  image_url: string | null;
  sort_order: number;
};

export type Product = {
  id: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  category_id: string | null;
  brand: string | null;
  base_price: number;
  sale_price: number | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  is_tintable: boolean;
  created_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
};

export type ProductWithImage = Product & { image_url: string | null };
