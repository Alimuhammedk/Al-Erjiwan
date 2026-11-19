import Link from "next/link";
import { ar } from "@/content/ar";
import { PAGE_SIZE, type ShopQuery } from "@/lib/shop/query";

function href(q: ShopQuery, page: number): string {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  if (q.category) p.set("category", q.category);
  if (q.brand) p.set("brand", q.brand);
  if (q.min !== null) p.set("min", String(q.min));
  if (q.max !== null) p.set("max", String(q.max));
  if (q.sort !== "newest") p.set("sort", q.sort);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/shop?${s}` : "/shop";
}

export function Pagination({ query, total }: { query: ShopQuery; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const link = "rounded-full border-2 border-brand-700 px-5 py-2 font-bold text-brand-700 hover:bg-brand-50";
  return (
    <nav className="flex items-center justify-center gap-4 pt-6" aria-label={ar.shop.title}>
      {query.page > 1 && (
        <Link href={href(query, query.page - 1)} className={link}>
          {ar.shop.prev}
        </Link>
      )}
      <span className="text-sm text-ink/70">
        {query.page} / {pages}
      </span>
      {query.page < pages && (
        <Link href={href(query, query.page + 1)} className={link}>
          {ar.shop.next}
        </Link>
      )}
    </nav>
  );
}
