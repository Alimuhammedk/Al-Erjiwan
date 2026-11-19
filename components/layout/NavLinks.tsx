"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ar } from "@/content/ar";
import { isCurrent } from "@/lib/nav";

type NavLink = { key: string; label: string; href: string };

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label={ar.common.menu}>
      {links.map((l) => {
        const current = isCurrent(pathname, l.href);
        return (
          <Link
            key={l.key}
            href={l.href}
            aria-current={current ? "page" : undefined}
            className={`rounded-full px-4 py-2 font-semibold transition-colors ${
              current ? "bg-brand-50 text-brand-700" : "text-brand-900 hover:bg-brand-50 hover:text-coral-500"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
