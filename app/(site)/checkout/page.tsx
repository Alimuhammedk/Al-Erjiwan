import type { Metadata } from "next";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { ar } from "@/content/ar";
import { getDeliveryZones } from "@/lib/data/orders";

export const metadata: Metadata = { title: `${ar.checkout.title} | ${ar.siteName}` };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const zones = await getDeliveryZones();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brand-900">{ar.checkout.title}</h1>
      <CheckoutForm zones={zones} />
    </main>
  );
}
