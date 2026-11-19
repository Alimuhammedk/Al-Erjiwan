import { CompanyForm } from "@/components/admin/CompanyForm";
import { ar } from "@/content/ar";
import { saveCompanyAction } from "../actions";

export default function NewCompanyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.add} · {ar.admin.delivery.companiesTitle}
      </h1>
      <CompanyForm action={saveCompanyAction.bind(null, null)} />
    </main>
  );
}
