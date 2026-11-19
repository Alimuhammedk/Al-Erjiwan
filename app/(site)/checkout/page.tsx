import type { Metadata } from "next";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { getMessages } from "@/lib/i18n/messages";
import { getDeliveryZones } from "@/lib/data/orders";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: `${m.checkout.title} | ${m.siteName}` };
}
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const m = await getMessages();
  const zones = await getDeliveryZones();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brand-900">{m.checkout.title}</h1>
      <CheckoutForm zones={zones} />
    </main>
  );
}
