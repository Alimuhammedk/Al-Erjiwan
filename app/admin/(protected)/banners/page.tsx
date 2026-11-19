import Image from "next/image";
import Link from "next/link";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ar } from "@/content/ar";
import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Banner } from "@/types/db";
import { deleteBannerAction } from "./actions";

export default async function BannersPage() {
  const db = await createAuthClient();
  const { data } = await db.from("banners").select("*").order("sort_order");
  const banners = (data as Banner[] | null) ?? [];
  const t = ar.admin.banners;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900">{t.title}</h1>
        <Link href="/admin/banners/new" className="rounded-full bg-brand-700 px-5 py-2 font-bold text-white">
          {ar.admin.add}
        </Link>
      </div>
      {banners.length === 0 ? (
        <p className="rounded-2xl bg-paper p-8 text-center text-brand-700">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-brand-100 rounded-2xl bg-paper">
          {banners.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="relative h-14 w-28 overflow-hidden rounded-xl bg-brand-50">
                <Image src={b.image_url} alt="" fill sizes="112px" className="object-cover" />
              </div>
              <span className="min-w-0 flex-1 break-words font-bold text-brand-900">{b.title ?? "—"}</span>
              {!b.is_active && <span className="rounded-full bg-ink px-2 py-0.5 text-xs text-white">{ar.admin.products.hidden}</span>}
              <span className="text-sm text-ink/60">#{b.sort_order}</span>
              <Link href={`/admin/banners/${b.id}`} className="rounded-full border-2 border-brand-700 px-4 py-1.5 text-sm font-bold text-brand-700">
                {ar.admin.edit}
              </Link>
              <DeleteButton action={deleteBannerAction.bind(null, b.id)} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
