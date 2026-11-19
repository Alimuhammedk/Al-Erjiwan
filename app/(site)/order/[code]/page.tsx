import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClearCart } from "@/components/shop/ClearCart";
import { OrderConfirmationView } from "@/components/shop/OrderConfirmationView";
import { ar } from "@/content/ar";
import { getOrderSummary } from "@/lib/data/orders";

export const metadata: Metadata = { title: `${ar.order.receivedTitle} | ${ar.siteName}`, robots: { index: false } };
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
