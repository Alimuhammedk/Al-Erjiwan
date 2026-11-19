import { ProductForm } from "@/components/admin/ProductForm";
import { ar } from "@/content/ar";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { saveProductAction } from "../actions";

export default async function NewProductPage() {
  const db = await createAuthClient();
  const { data } = await db.from("categories").select("id, name_ar").order("sort_order");
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.add} · {ar.admin.products.title}
      </h1>
      <ProductForm action={saveProductAction.bind(null, null)} categories={data ?? []} />
    </main>
  );
}
