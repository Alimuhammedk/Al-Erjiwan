import Link from "next/link";
import { ar } from "@/content/ar";
import type { ColourProduct } from "@/lib/data/colours";
import { COLOURS_PER_PAGE, type ColourQuery } from "@/lib/colours/query";
import { readableTextOn } from "@/lib/colours/hex";
import type { PickableColour } from "@/lib/colours/search";
import { ColourWheel } from "./ColourWheel";
import { RoomPreview } from "./RoomPreview";

const t = ar.colours;

type Props = {
  basePath: string;
  productBase: string;
  query: ColourQuery;
  families: string[];
  colours: PickableColour[];
  total: number;
  closest: PickableColour[] | null;
  selected: PickableColour | null;
  products: ColourProduct[];
};

function Swatch({ c, href, active }: { c: PickableColour; href: string; active?: boolean }) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-label={t.pickLabel.replace("{name}", c.name_ar)}
        aria-current={active ? "true" : undefined}
        data-testid="colour-swatch"
        className={`block overflow-hidden rounded-2xl border-2 bg-paper transition-shadow hover:shadow-md ${active ? "border-brand-700 ring-2 ring-brand-500" : "border-brand-100"}`}
      >
        <span style={{ backgroundColor: c.hex, color: readableTextOn(c.hex) }} className="grid h-20 place-items-center text-xs font-bold" dir="ltr">
          {c.hex.toUpperCase()}
        </span>
        <span className="block p-2 text-center text-sm">
          <span className="block break-words font-bold text-brand-900">{c.name_ar}</span>
          {c.code && (
            <span dir="ltr" className="block text-xs text-ink/60">
              {[c.system, c.code].filter(Boolean).join(" ")}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

// The customer colour page, drawn from data handed in. The real page and the dev-only sample page both use it.
export function ColourBrowser({ basePath, productBase, query, families, colours, total, closest, selected, products }: Props) {
  const link = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | null> = {
      q: query.q || null,
      family: query.family,
      hex: query.hex,
      c: selected?.id ?? null,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const keep: Record<string, string> = {};
  if (query.q) keep.q = query.q;
  if (query.family) keep.family = query.family;

  const paint = selected?.hex ?? query.hex;
  const pages = Math.max(1, Math.ceil(total / COLOURS_PER_PAGE));
  const chip = "inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold";
  const nothingYet = total === 0 && !query.q && !query.family && !closest;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-900">{t.title}</h1>
        <p className="max-w-2xl leading-8 text-ink/80">{t.intro}</p>
      </header>

      {nothingYet ? (
        <p className="rounded-2xl bg-paper p-10 text-center text-brand-700">{t.empty}</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
          <aside className="space-y-6">
            <section className="space-y-3 rounded-2xl bg-paper p-5">
              <h2 className="text-lg font-extrabold text-brand-900">{t.wheel}</h2>
              <ColourWheel hex={query.hex} basePath={basePath} keep={keep} />
            </section>
          </aside>

          <div className="min-w-0 space-y-6">
            <form method="get" action={basePath} className="flex gap-2">
              {query.family && <input type="hidden" name="family" value={query.family} />}
              <input
                type="search"
                name="q"
                defaultValue={query.q}
                maxLength={40}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
                className="h-11 min-w-0 flex-1 rounded-xl border border-brand-100 bg-paper px-4 focus:border-brand-500 focus:outline-none"
              />
              <button type="submit" className="min-h-11 rounded-full bg-brand-700 px-6 font-bold text-white hover:bg-brand-900">
                {t.search}
              </button>
            </form>

            {families.length > 0 && (
              <nav aria-label={t.families} className="flex gap-2 overflow-x-auto pb-1">
                <Link href={link({ family: null, c: null })} aria-current={query.family === null ? "page" : undefined} className={`${chip} ${query.family === null ? "bg-brand-700 text-white" : "bg-paper text-brand-700 hover:bg-brand-50"}`}>
                  {t.all}
                </Link>
                {families.map((f) => (
                  <Link key={f} href={link({ family: f, c: null })} aria-current={query.family === f ? "page" : undefined} className={`${chip} ${query.family === f ? "bg-brand-700 text-white" : "bg-paper text-brand-700 hover:bg-brand-50"}`}>
                    {f}
                  </Link>
                ))}
              </nav>
            )}

            {paint && (
              <section className="space-y-4 rounded-2xl bg-paper p-5" data-testid="selected-colour" data-hex={paint}>
                <div className="flex flex-wrap items-center gap-4">
                  <span style={{ backgroundColor: paint }} className="size-20 shrink-0 rounded-2xl border border-ink/15" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink/70">{t.yourColour}</p>
                    <p className="break-words text-xl font-extrabold text-brand-900">{selected ? selected.name_ar : paint.toUpperCase()}</p>
                    {selected?.code && (
                      <p dir="ltr" className="text-start text-sm text-ink/70">
                        {[selected.system, selected.code].filter(Boolean).join(" ")}
                      </p>
                    )}
                  </div>
                  <Link href={link({ hex: null, c: null })} className="min-h-11 content-center text-sm font-bold text-brand-700 underline">
                    {t.clear}
                  </Link>
                </div>
                <RoomPreview hex={paint} />
                <p role="note" className="rounded-xl bg-brand-50 p-3 text-sm leading-7 text-ink/80">
                  {t.honestNote}
                </p>
                {selected && (
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-brand-900">{t.products}</h3>
                    {products.length === 0 ? (
                      <p className="text-sm text-ink/70">{t.noProducts}</p>
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {products.map((p) => (
                          <li key={p.id}>
                            <Link href={`${productBase}/${p.id}?colour=${selected.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-brand-100 px-4 font-bold text-brand-900 hover:border-brand-500">
                              {p.name}
                              <span className="text-xs font-normal text-ink/60">{p.kind === "ready" ? t.ready : t.mixed}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>
            )}

            {closest && (
              <section className="space-y-3" data-testid="closest">
                <h2 className="text-lg font-extrabold text-brand-900">
                  {t.closest} <span className="text-sm font-normal text-ink/60">({t.closestNote})</span>
                </h2>
                {closest.length === 0 ? (
                  <p className="text-ink/70">{t.noResults}</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {closest.map((c) => (
                      <Swatch key={c.id} c={c} href={link({ c: c.id })} active={c.id === selected?.id} />
                    ))}
                  </ul>
                )}
              </section>
            )}

            {!closest && (
              <section className="space-y-3" data-testid="results">
                <h2 className="text-lg font-extrabold text-brand-900">
                  {t.results} <span className="text-sm font-normal text-ink/60">({total})</span>
                </h2>
                {colours.length === 0 ? (
                  <p role="status" className="rounded-2xl bg-paper p-8 text-center text-brand-700">
                    {t.noResults}
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {colours.map((c) => (
                      <Swatch key={c.id} c={c} href={link({ c: c.id })} active={c.id === selected?.id} />
                    ))}
                  </ul>
                )}
                {pages > 1 && (
                  <nav className="flex items-center justify-center gap-4 pt-2">
                    {query.page > 1 && (
                      <Link href={link({ page: String(query.page - 1) })} className="min-h-11 rounded-full border-2 border-brand-700 px-5 py-2 font-bold text-brand-700">
                        {t.prev}
                      </Link>
                    )}
                    <span className="text-sm text-ink/70">
                      {query.page} / {pages}
                    </span>
                    {query.page < pages && (
                      <Link href={link({ page: String(query.page + 1) })} className="min-h-11 rounded-full border-2 border-brand-700 px-5 py-2 font-bold text-brand-700">
                        {t.next}
                      </Link>
                    )}
                  </nav>
                )}
              </section>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
