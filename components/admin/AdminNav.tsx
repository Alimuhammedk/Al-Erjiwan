"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ar } from "@/content/ar";

const links = [
  { href: "/admin", label: ar.admin.nav.dashboard },
  { href: "/admin/orders", label: ar.admin.nav.orders },
  { href: "/admin/products", label: ar.admin.nav.products },
  { href: "/admin/categories", label: ar.admin.nav.categories },
  { href: "/admin/banners", label: ar.admin.nav.banners },
  { href: "/admin/delivery-fees", label: ar.admin.nav.deliveryFees },
  { href: "/admin/delivery-companies", label: ar.admin.nav.deliveryCompanies },
];

export function AdminNav({ newOrders = 0 }: { newOrders?: number }) {
  const path = usePathname();
  return (
    <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-3 print:hidden">
      {links.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold ${
              active ? "bg-brand-700 text-white" : "text-brand-700 hover:bg-brand-50"
            }`}
          >
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
