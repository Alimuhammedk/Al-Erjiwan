export type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

// Returned by form actions to the form on screen; success redirects instead.
export type ActionState = { errors?: Record<string, string>; error?: string };

// The product save also reports which product was already created if a later step (photos, sizes) failed.
export type ProductSaveState = ActionState & { savedId?: string };

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
  finish: string | null;
  rooms: string[];
  all_colours?: boolean; // mixed paint: every catalogue colour (true) or only the chosen ones
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
