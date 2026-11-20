import { DeliveryFeesForm } from "@/components/admin/DeliveryFeesForm";
import { ar } from "@/content/ar";
import { getAdminZones } from "@/lib/admin/delivery-data";
import { saveZonesAction } from "../delivery-fees/actions";

export const dynamic = "force-dynamic";
const t = ar.admin.delivery;

// The delivery tab: what customers pay per governorate.
export default async function DeliveryPage() {
  const zones = await getAdminZones();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-8">
      <h1 className="sr-only">{t.title}</h1>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold text-brand-900">{t.feesTitle}</h2>
        <DeliveryFeesForm zones={zones} action={saveZonesAction} />
      </section>
    </main>
  );
}
