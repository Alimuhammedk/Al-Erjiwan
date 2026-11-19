"use client";

import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import { useCart } from "@/lib/cart/CartProvider";

export function CartLink() {
  const m = useMessages();
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `${m.common.cart} (${count})` : m.common.cart}
      className="relative grid size-11 place-items-center rounded-full text-brand-900 hover:bg-brand-50"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      {count > 0 && (
        // key={count}: the badge is replaced on every change, so the bump animation plays again
        <span key={count} data-testid="cart-badge" className="bump absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-coral-500 px-1 text-xs font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
