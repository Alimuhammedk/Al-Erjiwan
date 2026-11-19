import Link from "next/link";
import { ar } from "@/content/ar";
import { listAdminPages } from "@/lib/admin/pages-data";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
const t = ar.admin.pages;

export default async function AdminPagesPage() {
  const pages = await listAdminPages();
  const btn = "inline-flex min-h-10 items-center rounded-full border-2 border-brand-700 px-4 text-sm font-bold text-brand-700";
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">{t.title}</h1>
      <p className="max-w-3xl text-ink/80">{t.intro}</p>
      <ul className="divide-y divide-brand-100 rounded-2xl bg-paper">
        {pages.map((p) => (
          <li key={p.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-brand-900">{ar.pages[p.slug]}</p>
              <p className="text-sm text-ink/60">
                {t.updated}: {formatDateTime(p.updated_at)}
              </p>
            </div>
            <Link href={`/${p.slug}`} className={btn} target="_blank">
              {t.view}
            </Link>
            <Link href={`/admin/pages/${p.slug}`} className={btn}>
              {ar.admin.edit}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
