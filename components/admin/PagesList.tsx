import Link from "next/link";
import { ar } from "@/content/ar";
import { listAdminPages } from "@/lib/admin/pages-data";
import { formatDateTime } from "@/lib/format";

const t = ar.admin.pages;

// The About, FAQ and Return policy pages, shown under the articles in the same admin tab.
export async function PagesList() {
  const pages = await listAdminPages();
  const btn = "inline-flex min-h-10 items-center rounded-full border-2 border-brand-700 px-4 text-sm font-bold text-brand-700";
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-extrabold text-brand-900">{t.title}</h2>
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
    </section>
  );
}
