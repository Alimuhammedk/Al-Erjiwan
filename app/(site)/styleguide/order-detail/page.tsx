import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/admin/OrderDetailView";
import { STATUS_ORDER, type AdminOrder } from "@/lib/admin/orders";
import { echoDelete, echoSaveNotes, echoSetStatus } from "./echo-actions";

// Dev-only copy of the admin order page with sample data, so it can be tried (and tested) without logging in.
// Remove before launch.
export default async function OrderDetailHarness({ searchParams }: { searchParams: Promise<{ status?: string; problems?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { status = "new", problems = "0" } = await searchParams;
  const order: AdminOrder = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    code: "ABCD1234",
    customer_name: "علي حسين",
    phone: "07701234567",
    governorate: "بابل",
    city: "الكفل",
    address: "حي الجامعة، شارع 5، دار رقم 12",
    landmark: "قرب الجامع الكبير",
    notes: "اتصل قبل الوصول",
    subtotal: 118000,
    delivery_fee: 5000,
    total: 123000,
    status: (STATUS_ORDER as readonly string[]).includes(status) ? status : "new",
    delivery_company: null,
    tracking_note: null,
    internal_note: "زبون جديد",
    created_at: "2026-11-20T10:00:00Z",
    updated_at: "2026-11-20T10:00:00Z",
    items: [
      { product_name: "بنتلايت داخلي ممتاز", size_label: "4 لتر", colour_name: "كريمي", colour_code: "JW-102", colour_note: null, quantity: 2, unit_price: 59000 },
      { product_name: "دهان مخلوط", size_label: "1 لتر", colour_name: null, colour_code: null, colour_note: "٤٢٠", quantity: 1, unit_price: 0 },
    ],
  };
  return (
    <OrderDetailView
      order={order}
      problemCount={Math.max(0, Number(problems) || 0)}
      printHref="/styleguide/order-detail"
      setStatus={echoSetStatus}
      saveNotes={echoSaveNotes}
      deleteOrder={echoDelete}
    />
  );
}
