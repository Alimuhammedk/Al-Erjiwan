import { ar } from "@/content/ar";
import type { OrderSummary } from "@/lib/data/orders";
import { formatPrice } from "@/lib/format";

// The WhatsApp text a customer can send to the shop from the confirmation page. It holds only what the order
// summary holds: the number, the items and the amount to pay. Name and address are already in the order.
export function confirmationMessage(code: string, summary: OrderSummary): string {
  const lines = summary.items.map((i) => `- ${i.name}${i.size ? ` (${i.size})` : ""} × ${i.quantity}`);
  return [ar.order.whatsappGreeting.replace("{code}", code), ...lines, `${ar.order.total}: ${formatPrice(summary.total)}`].join("\n");
}
