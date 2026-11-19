import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClearCart } from "@/components/shop/ClearCart";
import { OrderConfirmationView } from "@/components/shop/OrderConfirmationView";
import { getMessages } from "@/lib/i18n/messages";
import { getOrderSummary } from "@/lib/data/orders";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages();
  return { title: `${m.order.receivedTitle} | ${m.siteName}`, robots: { index: false } };
}
export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.trim().toUpperCase();
  const summary = await getOrderSummary(code);
  if (!summary) notFound();

  return (
    <>
      <ClearCart />
      <OrderConfirmationView code={code} summary={summary} />
    </>
  );
}
