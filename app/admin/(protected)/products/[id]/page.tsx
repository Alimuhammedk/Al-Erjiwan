import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductPhotos } from "@/components/admin/ProductPhotos";
import { VariantsEditor, type VariantRow } from "@/components/admin/VariantsEditor";
import { ar } from "@/content/ar";
import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Product, ProductImage } from "@/types/db";
import { saveProductAction } from "../actions";

type VariantDb = { id: string; size_label: string; price: number; stock: number; colour_id: string | null };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createAuthClient();
  const [{ data: product }, { data: categories }, { data: images }, { data: variants }, { data: colours }] =
    await Promise.all([
      db.from("products").select("*").eq("id", id).maybeSingle(),
      db.from("categories").select("id, name_ar").order("sort_order"),
      db.from("product_images").select("url, sort_order").eq("product_id", id).order("sort_order"),
      db.from("product_variants").select("*").eq("product_id", id).order("price"),
      db.from("colours").select("id, name_ar").order("name_ar"),
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
      <ProductForm action={saveProductAction.bind(null, id)} categories={categories ?? []} initial={product as Product} />
      <ProductPhotos productId={id} initial={((images as Pick<ProductImage, "url">[] | null) ?? []).map((i) => i.url)} />
      <VariantsEditor productId={id} initial={rows} colours={colours ?? []} />
    </main>
  );
}
