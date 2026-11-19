import { ar } from "@/content/ar";
import { formatPrice } from "@/lib/format";
import { sanitiseSearch } from "@/lib/shop/query";

const m = ar.admin.orders.msg;

export type AdminOrderItem = {
  product_name: string | null;
  size_label: string | null;
  colour_name: string | null;
  colour_code: string | null;
  colour_note: string | null;
  quantity: number;
  unit_price: number;
};

export type AdminOrder = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  governorate: string;
  city: string | null;
  address: string;
  landmark: string | null;
  notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  delivery_company: string | null;
  delivery_company_id: string | null;
  delivery_cost: number | null;
  delivery_notes: string | null;
  created_at: string;
  updated_at: string;
  items: AdminOrderItem[];
};

export const STATUS_ORDER = ["new", "confirmed", "shipped", "delivered", "cancelled", "returned"] as const;

// Any status can move to any other (the database applies the stock rules), so every other status is offered.
export const otherStatuses = (status: string): string[] => STATUS_ORDER.filter((s) => s !== status);

// What the customer paid for delivery minus what the company charges; null when the company has no price.
export const costDifference = (fee: number, cost: number | null): number | null => (cost === null ? null : fee - cost);

// 07701234567 -> 9647701234567 (the form wa.me wants)
export const internationalPhone = (phone: string) => "964" + phone.replace(/^0/, "");

const fill = (text: string, values: Record<string, string>) =>
  Object.entries(values).reduce((t, [k, v]) => t.replaceAll(`{${k}}`, v), text);

function itemLine(i: AdminOrderItem): string {
  const colour = [i.colour_name, i.colour_code].filter(Boolean).join(" ") || i.colour_note || "";
  return `- ${i.product_name ?? "—"}${i.size_label ? ` (${i.size_label})` : ""}${colour ? ` ${colour}` : ""} × ${i.quantity}`;
}

const place = (o: AdminOrder) => [o.governorate, o.city].filter(Boolean).join(" - ");

// A ready message to the customer. "confirm" asks them to confirm the order and address; "update" tells them the status.
export function customerWhatsAppUrl(order: AdminOrder, kind: "confirm" | "update"): string {
  const base = fill(kind === "confirm" ? m.confirmGreeting : m.update, {
    name: order.customer_name,
    code: order.code,
    status: (ar.order.statuses as Record<string, string>)[order.status] ?? order.status,
  });
  const lines =
    kind === "confirm"
      ? [
          base,
          ...order.items.map(itemLine),
          `${ar.order.total}: ${formatPrice(order.total)} ${fill(m.includesDelivery, { fee: formatPrice(order.delivery_fee) })}`,
          `${m.address}: ${place(order)} - ${order.address}`,
          m.confirmAsk,
        ]
      : [
          base,
          ...(order.delivery_company ? [`${m.company}: ${order.delivery_company}`] : []),
        ];
  return `https://wa.me/${internationalPhone(order.phone)}?text=${encodeURIComponent(lines.join("\n"))}`;
}

// Everything a delivery company needs, including the exact cash to collect.
export function deliveryMessage(order: AdminOrder): string {
  return [
    fill(m.deliveryTitle, { code: order.code }),
    `${m.name}: ${order.customer_name}`,
    `${m.phone}: ${order.phone}`,
    `${m.governorate}: ${place(order)}`,
    `${m.address}: ${order.address}`,
    ...(order.landmark ? [`${m.landmark}: ${order.landmark}`] : []),
    `${m.products}:`,
    ...order.items.map(itemLine),
    `${m.collect}: ${formatPrice(order.total)} ${fill(m.includesDelivery, { fee: formatPrice(order.delivery_fee) })}`,
    ...(order.notes ? [`${m.notes}: ${order.notes}`] : []),
    ...(order.delivery_notes ? [`${m.deliveryNotes}: ${order.delivery_notes}`] : []),
  ].join("\n");
}

// Opens a WhatsApp chat with the chosen delivery company, with the delivery message ready to send.
export const deliveryWhatsAppUrl = (order: AdminOrder, company: { whatsapp: string }) =>
  `https://wa.me/${internationalPhone(company.whatsapp)}?text=${encodeURIComponent(deliveryMessage(order))}`;

export const ORDERS_PER_PAGE = 20;

export type OrderListQuery = { status: string | null; q: string; page: number };

// The orders list reads its filters from the page address. The search text is cleaned because it goes into a
// database filter, and a bad page number just becomes a valid one.
export function parseOrderListQuery(params: Record<string, string | string[] | undefined>): OrderListQuery {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const status = first(params.status);
  const page = Number(first(params.page));
  return {
    status: (STATUS_ORDER as readonly string[]).includes(status) ? status : null,
    q: sanitiseSearch(first(params.q)).slice(0, 40).trim(),
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, 500) : 1,
  };
}
