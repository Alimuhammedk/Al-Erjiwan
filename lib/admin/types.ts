export type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

// Returned by form actions to the form on screen; success redirects instead.
export type ActionState = { errors?: Record<string, string>; error?: string };

export type ProductInput = {
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
};

export type VariantInput = {
  size_label: string;
  price: number;
  stock: number;
  colour_id: string | null;
};

export type CategoryInput = {
  name_ar: string;
  name_en: string | null;
  image_url: string | null;
  sort_order: number;
};

export type BannerInput = {
  image_url: string;
  title: string | null;
  link: string | null;
  sort_order: number;
  is_active: boolean;
};
