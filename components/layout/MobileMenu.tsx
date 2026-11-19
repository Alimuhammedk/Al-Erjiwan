"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ar } from "@/content/ar";

type NavLink = { key: string; label: string; href: string };

export function MobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? ar.common.closeMenu : ar.common.menu}
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-full text-brand-900 hover:bg-brand-50"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <nav id="mobile-menu" className="absolute inset-x-0 top-full border-b border-brand-100 bg-paper shadow-lg">
          <ul className="flex flex-col px-4 py-2">
            {links.map((l) => (
              <li key={l.key}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block py-3 text-lg font-semibold text-brand-900">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
