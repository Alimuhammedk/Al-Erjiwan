import { DeliveryFeesForm } from "@/components/admin/DeliveryFeesForm";
import { ar } from "@/content/ar";
import { getAdminZones } from "@/lib/admin/delivery-data";
import { saveZonesAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function DeliveryFeesPage() {
  const zones = await getAdminZones();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">{ar.admin.delivery.feesTitle}</h1>
      <DeliveryFeesForm zones={zones} action={saveZonesAction} />
    </main>
  );
}
