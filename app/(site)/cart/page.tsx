import type { Metadata } from "next";
import { CartView } from "@/components/shop/CartView";
import { getMessages } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: `${m.cart.title} | ${m.siteName}` };
}

export default async function CartPage() {
  const m = await getMessages();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brand-900">{m.cart.title}</h1>
      <CartView />
    </main>
  );
}
