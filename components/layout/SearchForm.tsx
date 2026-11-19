import { ar } from "@/content/ar";

// Plain GET form to the shop: works without JavaScript, and the shop page does the searching.
export function SearchForm({ className = "" }: { className?: string }) {
  return (
    <form role="search" action="/shop" method="get" className={`relative ${className}`}>
      <input
        type="search"
        name="q"
        maxLength={60}
        aria-label={ar.common.searchSite}
        placeholder={ar.common.searchSite}
        className="h-11 w-full rounded-full border border-brand-100 bg-brand-50 ps-4 pe-12 text-sm focus:border-brand-500 focus:bg-paper focus:outline-none"
      />
      <button
        type="submit"
        aria-label={ar.common.search}
        className="absolute end-0 top-0 grid size-11 place-items-center rounded-full text-brand-700 hover:text-coral-500"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
      </button>
    </form>
  );
}
