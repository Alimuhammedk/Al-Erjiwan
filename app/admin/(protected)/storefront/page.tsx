import Image from "next/image";
import Link from "next/link";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ar } from "@/content/ar";
import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Banner, Category } from "@/types/db";
import { deleteBannerAction } from "../banners/actions";
import { deleteCategoryAction } from "../categories/actions";

export const dynamic = "force-dynamic";

// One tab for what the shop front shows: the categories and the homepage banners.
export default async function StorefrontPage() {
  const db = await createAuthClient();
  const [{ data: cats }, { data: bans }] = await Promise.all([
    db.from("categories").select("*").order("sort_order"),
    db.from("banners").select("*").order("sort_order"),
  ]);
  const categories = (cats as Category[] | null) ?? [];
  const banners = (bans as Banner[] | null) ?? [];
  const add = "inline-flex min-h-11 items-center rounded-full bg-brand-700 px-5 font-bold text-white";
  const edit = "inline-flex min-h-10 items-center rounded-full border-2 border-brand-700 px-4 text-sm font-bold text-brand-700";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-8">
      <h1 className="sr-only">{ar.admin.nav.storefront}</h1>

      <section className="space-y-4" aria-labelledby="categories-title">
        <div className="flex items-center justify-between">
          <h2 id="categories-title" className="text-2xl font-extrabold text-brand-900">
            {ar.admin.categories.title}
          </h2>
          <Link href="/admin/categories/new" className={add}>
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
                <span className="min-w-0 flex-1 break-words font-bold text-brand-900">{c.name_ar}</span>
                <span className="text-sm text-ink/70">#{c.sort_order}</span>
                <Link href={`/admin/categories/${c.id}`} className={edit}>
                  {ar.admin.edit}
                </Link>
                <DeleteButton action={deleteCategoryAction.bind(null, c.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="banners-title">
        <div className="flex items-center justify-between">
          <h2 id="banners-title" className="text-2xl font-extrabold text-brand-900">
            {ar.admin.banners.title}
          </h2>
          <Link href="/admin/banners/new" className={add}>
            {ar.admin.add}
          </Link>
        </div>
        {banners.length === 0 ? (
          <p className="rounded-2xl bg-paper p-8 text-center text-brand-700">{ar.admin.banners.empty}</p>
        ) : (
          <ul className="divide-y divide-brand-100 rounded-2xl bg-paper">
            {banners.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="relative h-14 w-28 overflow-hidden rounded-xl bg-brand-50">
                  <Image src={b.image_url} alt="" fill sizes="112px" className="object-cover" />
                </div>
                <span className="min-w-0 flex-1 break-words font-bold text-brand-900">{b.title ?? "—"}</span>
                {!b.is_active && <span className="rounded-full bg-ink px-2 py-0.5 text-xs text-white">{ar.admin.products.hidden}</span>}
                <span className="text-sm text-ink/70">#{b.sort_order}</span>
                <Link href={`/admin/banners/${b.id}`} className={edit}>
                  {ar.admin.edit}
                </Link>
                <DeleteButton action={deleteBannerAction.bind(null, b.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
