import Link from "next/link";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ar } from "@/content/ar";
import { formatPrice } from "@/lib/format";
import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Product } from "@/types/db";
import { deleteProductAction, toggleProductActiveAction } from "./actions";

type Row = Product & { categories: { name_ar: string } | null };

export default async function ProductsPage() {
  const db = await createAuthClient();
  const { data } = await db
    .from("products")
    .select("*, categories(name_ar)")
    .order("created_at", { ascending: false });
  const products = (data as Row[] | null) ?? [];
  const t = ar.admin.products;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900">{t.title}</h1>
        <Link href="/admin/products/new" className="rounded-full bg-brand-700 px-5 py-2 font-bold text-white">
          {ar.admin.add}
        </Link>
      </div>
      {products.length === 0 ? (
        <p className="rounded-2xl bg-paper p-8 text-center text-brand-700">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-brand-100 rounded-2xl bg-paper">
          {products.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="break-words font-bold text-brand-900">
                  {p.name_ar}
                  {!p.is_active && (
                    <span className="ms-2 rounded-full bg-ink px-2 py-0.5 text-xs text-white">{t.hidden}</span>
                  )}
                </p>
                <p className="text-sm text-ink/70">
                  {p.categories?.name_ar ?? t.noCategory} · {formatPrice(p.sale_price ?? p.base_price)} · {t.stock}: {p.stock}
                </p>
              </div>
              <form action={toggleProductActiveAction.bind(null, p.id, !p.is_active)}>
                <button type="submit" className="rounded-full border-2 border-brand-100 px-4 py-1.5 text-sm font-bold text-ink/70 hover:bg-brand-50">
                  {p.is_active ? t.hide : t.show}
                </button>
              </form>
              <Link href={`/admin/products/${p.id}`} className="rounded-full border-2 border-brand-700 px-4 py-1.5 text-sm font-bold text-brand-700">
                {ar.admin.edit}
              </Link>
              <DeleteButton action={deleteProductAction.bind(null, p.id)} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
