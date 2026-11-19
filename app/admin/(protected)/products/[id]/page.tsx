import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { ar } from "@/content/ar";
import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Product } from "@/types/db";
import { saveProductAction } from "../actions";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createAuthClient();
  const [{ data: product }, { data: categories }] = await Promise.all([
    db.from("products").select("*").eq("id", id).maybeSingle(),
    db.from("categories").select("id, name_ar").order("sort_order"),
  ]);
  if (!product) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.edit} · {ar.admin.products.title}
      </h1>
      <ProductForm action={saveProductAction.bind(null, id)} categories={categories ?? []} initial={product as Product} />
    </main>
  );
}
