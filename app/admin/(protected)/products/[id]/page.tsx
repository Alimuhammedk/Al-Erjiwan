import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import type { VariantRow } from "@/components/admin/VariantsEditor";
import { ar } from "@/content/ar";
import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Product } from "@/types/db";
import { saveProductAction } from "../actions";

type VariantDb = { id: string; size_label: string; price: number; stock: number; colour_id: string | null };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createAuthClient();
  const [{ data: product }, { data: categories }, { data: images }, { data: variants }, { data: colours }, { data: chosen }] =
    await Promise.all([
      db.from("products").select("*").eq("id", id).maybeSingle(),
      db.from("categories").select("id, name_ar").order("sort_order"),
      db.from("product_images").select("url, sort_order").eq("product_id", id).order("sort_order"),
      db.from("product_variants").select("*").eq("product_id", id).order("price"),
      db.from("colours").select("id, name_ar, name_en, code, hex, family").order("name_ar").limit(3000),
      db.from("product_colours").select("colour_id").eq("product_id", id),
    ]);
  if (!product) notFound();

  const rows: VariantRow[] = ((variants as VariantDb[] | null) ?? []).map((v) => ({
    id: v.id,
    size_label: v.size_label,
    price: String(v.price),
    stock: String(v.stock),
    colour_id: v.colour_id ?? "",
  }));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.edit} · {ar.admin.products.title}
      </h1>
      <ProductForm
        action={saveProductAction}
        categories={categories ?? []}
        colours={colours ?? []}
        initial={{
          product: product as Product,
          images: ((images as { url: string }[] | null) ?? []).map((i) => i.url),
          variants: rows,
          colourChoice: {
            all: (product as Product).all_colours !== false,
            ids: ((chosen as { colour_id: string }[] | null) ?? []).map((r) => r.colour_id),
          },
        }}
      />
    </main>
  );
}
