"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ar } from "@/content/ar";
import { ADMIN_TABS, activeTab } from "@/lib/admin/nav";

// Small line icons (24x24, drawn with strokes), one per tab.
const icons: Record<string, ReactNode> = {
  stats: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </>
  ),
  orders: (
    <>
      <path d="M6 2l-2 4v14a2 2 0 002 2h12a2 2 0 002-2V6l-2-4z" />
      <path d="M4 6h16" />
      <path d="M16 10a4 4 0 01-8 0" />
    </>
  ),
  storefront: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </>
  ),
  products: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  stock: (
    <>
      <path d="M12 2l10 5-10 5L2 7z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </>
  ),
  colours: (
    <>
      <path d="M12 22a10 10 0 110-20c5.5 0 10 3.6 10 8 0 3-2.5 4-5 4h-2a2 2 0 00-1.5 3.3A2 2 0 0112 22z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="12" cy="7" r="1" />
      <circle cx="16.5" cy="10" r="1" />
    </>
  ),
  delivery: (
    <>
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 3v5h-7z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </>
  ),
};

export function AdminNav({ newOrders = 0 }: { newOrders?: number }) {
  const current = activeTab(usePathname());
  return (
    <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-3 print:hidden" aria-label={ar.admin.menuLabel}>
      {ADMIN_TABS.map((l) => {
        const active = l.href === current;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors ${
              active ? "bg-brand-700 text-white shadow-sm" : "bg-brand-50/70 text-brand-700 hover:bg-brand-100"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-icon={l.icon}>
              {icons[l.icon]}
            </svg>
            {l.label}
            {l.href === "/admin/orders" && newOrders > 0 && (
              <span data-testid="new-orders-badge" className="grid min-w-5 place-items-center rounded-full bg-coral-500 px-1.5 text-xs font-bold text-white">
                {newOrders}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
