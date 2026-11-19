import Link from "next/link";
import { ColourDeleteButton } from "@/components/admin/ColourRowActions";
import { ar } from "@/content/ar";
import { listAdminColours } from "@/lib/admin/colours-data";
import { parseColourQuery, type ColourQuery } from "@/lib/colours/query";
import { readableTextOn } from "@/lib/colours/hex";
import { deleteColourAction } from "./actions";

export const dynamic = "force-dynamic";
const t = ar.admin.colours;
const PER_PAGE = 30;

function href(q: ColourQuery, patch: Partial<ColourQuery>): string {
  const n = { ...q, ...patch };
  const p = new URLSearchParams();
  if (n.q) p.set("q", n.q);
  if (n.family) p.set("family", n.family);
  if (n.page > 1) p.set("page", String(n.page));
  const s = p.toString();
  return s ? `/admin/colours?${s}` : "/admin/colours";
}

export default async function AdminColoursPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseColourQuery(await searchParams);
  const { colours, total, families } = await listAdminColours(query);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-brand-900">
          {t.title} <span className="text-base font-normal text-ink/70">({total})</span>
        </h1>
        <div className="flex gap-2">
          <Link href="/admin/colours/import" className="inline-flex min-h-11 items-center rounded-full border-2 border-brand-700 px-5 font-bold text-brand-700">
            {t.import}
          </Link>
          <Link href="/admin/colours/new" className="inline-flex min-h-11 items-center rounded-full bg-brand-700 px-5 font-bold text-white">
            {ar.admin.add}
          </Link>
        </div>
      </div>

      <form method="get" action="/admin/colours" className="flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query.q}
          maxLength={40}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
          className="h-11 min-w-0 flex-1 rounded-xl border border-brand-100 bg-paper px-4 focus:border-brand-500 focus:outline-none"
        />
        <select name="family" defaultValue={query.family ?? ""} aria-label={t.family} className="h-11 rounded-xl border border-brand-100 bg-paper px-3">
          <option value="">{t.allFamilies}</option>
          {families.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <button type="submit" className="min-h-11 rounded-full bg-brand-700 px-6 font-bold text-white hover:bg-brand-900">
          {ar.admin.orders.search}
        </button>
      </form>

      {colours.length === 0 ? (
        <p className="rounded-2xl bg-paper p-8 text-center text-brand-700">{query.q || query.family ? t.noMatch : t.empty}</p>
      ) : (
        <ul className="divide-y divide-brand-100 rounded-2xl bg-paper">
          {colours.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
              <span
                aria-hidden="true"
                style={{ backgroundColor: c.hex, color: readableTextOn(c.hex) }}
                className="grid size-12 shrink-0 place-items-center rounded-xl border border-ink/15 text-[10px] font-bold"
              >
                {c.hex.slice(1)}
              </span>
              <span className="min-w-0 flex-1 break-words font-bold text-brand-900">
                {c.name_ar}
                {c.name_en && (
                  <span dir="ltr" className="ms-2 font-normal text-ink/60">
                    {c.name_en}
                  </span>
                )}
              </span>
              <span dir="ltr" className="text-sm text-ink/70">
                {[c.system, c.code].filter(Boolean).join(" ")}
              </span>
              {c.family && <span className="rounded-full bg-brand-50 px-3 py-0.5 text-sm text-brand-700">{c.family}</span>}
              <Link href={`/admin/colours/${c.id}`} className="inline-flex min-h-10 items-center rounded-full border-2 border-brand-700 px-4 text-sm font-bold text-brand-700">
                {ar.admin.edit}
              </Link>
              <ColourDeleteButton action={deleteColourAction.bind(null, c.id)} sizes={c.sizes} />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-4 pt-2">
          {query.page > 1 && (
            <Link href={href(query, { page: query.page - 1 })} className="min-h-11 rounded-full border-2 border-brand-700 px-5 py-2 font-bold text-brand-700">
              {ar.admin.orders.prev}
            </Link>
          )}
          <span className="text-sm text-ink/70">
            {query.page} / {pages}
          </span>
          {query.page < pages && (
            <Link href={href(query, { page: query.page + 1 })} className="min-h-11 rounded-full border-2 border-brand-700 px-5 py-2 font-bold text-brand-700">
              {ar.admin.orders.next}
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
