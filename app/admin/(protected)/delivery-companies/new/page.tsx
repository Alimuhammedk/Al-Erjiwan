import { CompanyForm } from "@/components/admin/CompanyForm";
import { ar } from "@/content/ar";
import { getAdminZones } from "@/lib/admin/delivery-data";
import { saveCompanyAction } from "../actions";

export default async function NewCompanyPage() {
  const zones = await getAdminZones();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.add} · {ar.admin.delivery.companiesTitle}
      </h1>
      <CompanyForm action={saveCompanyAction.bind(null, null)} zones={zones} />
    </main>
  );
}
