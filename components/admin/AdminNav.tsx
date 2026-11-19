"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ar } from "@/content/ar";

const links = [
  { href: "/admin", label: ar.admin.nav.dashboard },
  { href: "/admin/products", label: ar.admin.nav.products },
  { href: "/admin/categories", label: ar.admin.nav.categories },
  { href: "/admin/banners", label: ar.admin.nav.banners },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
      {links.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold ${
              active ? "bg-brand-700 text-white" : "text-brand-700 hover:bg-brand-50"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
