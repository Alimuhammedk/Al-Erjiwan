import Image from "next/image";
import Link from "next/link";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ar } from "@/content/ar";
import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Category } from "@/types/db";
import { deleteCategoryAction } from "./actions";

export default async function CategoriesPage() {
  const db = await createAuthClient();
  const { data } = await db.from("categories").select("*").order("sort_order");
  const categories = (data as Category[] | null) ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900">{ar.admin.categories.title}</h1>
        <Link href="/admin/categories/new" className="rounded-full bg-brand-700 px-5 py-2 font-bold text-white">
          {ar.admin.add}
        </Link>
      </div>
      {categories.length === 0 ? (
        <p className="rounded-2xl bg-paper p-8 text-center text-brand-700">{ar.admin.categories.empty}</p>
      ) : (
        <ul className="divide-y divide-brand-100 rounded-2xl bg-paper">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="relative size-14 overflow-hidden rounded-xl bg-brand-50">
                {c.image_url && <Image src={c.image_url} alt="" fill sizes="56px" className="object-cover" />}
              </div>
              <span className="flex-1 font-bold text-brand-900">{c.name_ar}</span>
              <span className="text-sm text-ink/60">#{c.sort_order}</span>
              <Link href={`/admin/categories/${c.id}`} className="rounded-full border-2 border-brand-700 px-4 py-1.5 text-sm font-bold text-brand-700">
                {ar.admin.edit}
              </Link>
              <DeleteButton action={deleteCategoryAction.bind(null, c.id)} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
