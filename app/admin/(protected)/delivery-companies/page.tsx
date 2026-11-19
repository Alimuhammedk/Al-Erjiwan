import { redirect } from "next/navigation";

// The companies now live in the single "التوصيل" tab.
export default function DeliveryCompaniesRedirect() {
  redirect("/admin/delivery");
}
