import type { Metadata } from "next";
import { CartView } from "@/components/shop/CartView";
import { ar } from "@/content/ar";

export const metadata: Metadata = { title: `${ar.cart.title} | ${ar.siteName}` };

export default function CartPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brand-900">{ar.cart.title}</h1>
      <CartView />
    </main>
  );
}
