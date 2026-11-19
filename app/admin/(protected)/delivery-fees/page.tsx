import { redirect } from "next/navigation";

// The fees now live in the single "التوصيل" tab.
export default function DeliveryFeesRedirect() {
  redirect("/admin/delivery");
}
