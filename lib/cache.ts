import { updateTag } from "next/cache";

// Storefront reads (products, banners, categories, articles, pages) are kept for a short time and cleared
// the moment the owner saves a change or a sale lowers stock.
export const CATALOG_TAG = "catalog";
export const CATALOG_SECONDS = 60;
export const refreshCatalog = () => updateTag(CATALOG_TAG);
