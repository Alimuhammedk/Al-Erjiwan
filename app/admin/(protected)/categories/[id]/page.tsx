import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ar } from "@/content/ar";
import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Category } from "@/types/db";
import { saveCategoryAction } from "../actions";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createAuthClient();
  const { data } = await db.from("categories").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.edit} · {ar.admin.categories.title}
      </h1>
      <CategoryForm action={saveCategoryAction.bind(null, id)} initial={data as Category} />
    </main>
  );
}
