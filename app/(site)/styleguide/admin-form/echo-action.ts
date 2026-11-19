"use server";

import { notFound } from "next/navigation";
import { prepareProductSave } from "@/lib/admin/product-save";
import type { ProductSaveState } from "@/lib/admin/types";

// Dev-only stand-in for saveProductAction: runs the REAL validation but writes nothing and shows what would be
// saved. Remove together with the styleguide before launch.
export async function echoAction(_prev: ProductSaveState, formData: FormData): Promise<ProductSaveState> {
  if (process.env.NODE_ENV === "production") notFound();
  const plan = prepareProductSave(formData);
  if (!plan.ok) return { errors: plan.errors };
  const { id, product, images, variants, colours } = plan.value;
  return { error: `ECHO:${JSON.stringify({ id, product, images, variants, colours })}` };
}
