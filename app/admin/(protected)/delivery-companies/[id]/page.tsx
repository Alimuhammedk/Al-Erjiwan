import { notFound } from "next/navigation";
import { CompanyForm } from "@/components/admin/CompanyForm";
import { ar } from "@/content/ar";
import { getAdminZones, getCompany } from "@/lib/admin/delivery-data";
import { saveCompanyAction } from "../actions";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company, zones] = await Promise.all([getCompany(id), getAdminZones()]);
  if (!company) notFound();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.edit} · {company.name}
      </h1>
      <CompanyForm action={saveCompanyAction.bind(null, id)} zones={zones} initial={company} />
    </main>
  );
}
