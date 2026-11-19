"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { useCart } from "@/lib/cart/CartProvider";

// Pop-up that confirms an add to cart. It disappears by itself after 5 seconds, or when closed.
export function CartToast() {
  const m = useMessages();
  const { lastAdded, dismissAdded } = useCart();
  const pathname = usePathname();

  useEffect(() => {
    if (!lastAdded) return;
    const id = setTimeout(dismissAdded, 5000);
    return () => clearTimeout(id);
  }, [lastAdded, dismissAdded]);

  // The cart page already shows what was added.
  if (!lastAdded || pathname === "/cart") return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-brand-900 p-4 text-white shadow-2xl md:bottom-6"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-sun-300" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{m.product.added}</p>
        <p className="truncate text-sm text-white/80">{lastAdded.name}</p>
      </div>
      <Link href="/cart" onClick={dismissAdded} className="shrink-0 rounded-full bg-sun-300 px-4 py-2 font-extrabold text-brand-900">
        {m.common.viewCart}
      </Link>
      <button type="button" onClick={dismissAdded} aria-label={m.common.close} className="grid size-9 shrink-0 place-items-center rounded-full text-white/80 hover:bg-white/10">
        ×
      </button>
    </div>
  );
}
