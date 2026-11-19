import { notFound } from "next/navigation";
import { CompanyForm } from "@/components/admin/CompanyForm";
import { DeliveryFeesForm } from "@/components/admin/DeliveryFeesForm";
import type { AdminZone } from "@/lib/admin/delivery-data";
import { echoSaveCompany, echoSaveFees } from "./echo-actions";

// Dev-only copy of the two delivery tabs with sample data (?view=companies for the company form). Remove before launch.
const zones: AdminZone[] = [
  { id: "123e4567-e89b-12d3-a456-426614174001", governorate_ar: "بغداد", fee: 5000, min_order: 0, is_active: true },
  { id: "123e4567-e89b-12d3-a456-426614174002", governorate_ar: "البصرة", fee: 8000, min_order: 20000, is_active: true },
  { id: "123e4567-e89b-12d3-a456-426614174003", governorate_ar: "أربيل", fee: 10000, min_order: 0, is_active: false },
];

export default async function AdminDeliveryHarness({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      {view === "companies" ? (
        <CompanyForm action={echoSaveCompany} />
      ) : (
        <DeliveryFeesForm zones={zones} action={echoSaveFees} />
      )}
    </main>
  );
}
