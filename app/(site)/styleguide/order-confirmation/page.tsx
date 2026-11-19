import { notFound } from "next/navigation";
import { OrderConfirmationView } from "@/components/shop/OrderConfirmationView";

// Dev-only copy of the order confirmation page with a sample order. Remove before launch.
export default function OrderConfirmationHarness() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <OrderConfirmationView
      code="ABCD1234"
      summary={{
        status: "new",
        created_at: "2026-11-20T10:00:00Z",
        total: 123000,
        items: [
          { name: "بنتلايت داخلي ممتاز", size: "4 لتر", quantity: 2 },
          { name: "فرشاة طلاء احترافية", size: null, quantity: 1 },
        ],
      }}
    />
  );
}
