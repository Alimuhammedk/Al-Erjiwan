import Link from "next/link";
import { ar } from "@/content/ar";
import type { ShopQuery } from "@/lib/shop/query";

type Props = {
  query: ShopQuery;
  categories: { id: string; name_ar: string }[];
  brands: string[];
};

const field =
  "w-full rounded-xl border border-brand-100 bg-paper px-3 py-2.5 focus:border-brand-500 focus:outline-none";

function Select({ name, label, value, children }: { name: string; label: string; value: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-brand-900">{label}</span>
      <select name={name} defaultValue={value} className={field}>
        {children}
      </select>
    </label>
  );
}

// Plain GET form: filters live in the page address, so it works without JavaScript and can be shared.
export function ShopFilters({ query, categories, brands }: Props) {
  const t = ar.shop;
  return (
    <form method="get" className="space-y-4 rounded-2xl border border-brand-100 bg-paper p-4">
      <input
        type="search"
        name="q"
        defaultValue={query.q}
        placeholder={t.searchPlaceholder}
        aria-label={t.searchPlaceholder}
        maxLength={60}
        className={field}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Select name="category" label={t.category} value={query.category ?? ""}>
          <option value="">{t.all}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_ar}
            </option>
          ))}
        </Select>
        <Select name="brand" label={t.brand} value={query.brand ?? ""}>
          <option value="">{t.all}</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
        <Select name="room" label={t.room} value={query.room ?? ""}>
          <option value="">{t.all}</option>
          {ar.options.rooms.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select name="finish" label={t.finish} value={query.finish ?? ""}>
          <option value="">{t.all}</option>
          {ar.options.finishes.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-900">{t.minPrice}</span>
          <input name="min" inputMode="numeric" defaultValue={query.min ?? ""} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-900">{t.maxPrice}</span>
          <input name="max" inputMode="numeric" defaultValue={query.max ?? ""} className={field} />
        </label>
        <Select name="sort" label={t.sort} value={query.sort}>
          <option value="newest">{t.sortNewest}</option>
          <option value="price_asc">{t.sortPriceAsc}</option>
          <option value="price_desc">{t.sortPriceDesc}</option>
        </Select>
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" className="rounded-full bg-brand-700 px-6 py-2.5 font-bold text-white hover:bg-brand-900">
          {t.apply}
        </button>
        <Link href="/shop" className="font-bold text-brand-700">
          {t.reset}
        </Link>
      </div>
    </form>
  );
}
