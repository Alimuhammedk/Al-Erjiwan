import { ar } from "@/content/ar";
import { formatPrice } from "@/lib/format";

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
  tracking_note: string | null;
  internal_note: string | null;
  created_at: string;
  updated_at: string;
  items: AdminOrderItem[];
};

export const STATUS_ORDER = ["new", "confirmed", "shipped", "delivered", "cancelled", "returned"] as const;

// The same rules as set_order_status in the database. Cancelled and returned are final.
export function nextStatuses(status: string): string[] {
  switch (status) {
    case "new":
      return ["confirmed", "shipped", "delivered", "cancelled"];
    case "confirmed":
      return ["shipped", "delivered", "cancelled"];
    case "shipped":
      return ["delivered", "returned"];
    case "delivered":
      return ["returned"];
    default:
      return [];
  }
}

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
          ...(order.tracking_note ? [`${m.tracking}: ${order.tracking_note}`] : []),
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
  ].join("\n");
}

// wa.me without a number opens WhatsApp's chat picker, so Ali can send it to any delivery company.
export const deliveryWhatsAppUrl = (order: AdminOrder) => `https://wa.me/?text=${encodeURIComponent(deliveryMessage(order))}`;
