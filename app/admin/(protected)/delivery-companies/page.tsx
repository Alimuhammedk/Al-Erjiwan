import Link from "next/link";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ar } from "@/content/ar";
import { listCompanies } from "@/lib/admin/delivery-data";
import { deleteCompanyAction } from "./actions";

export const dynamic = "force-dynamic";
const t = ar.admin.delivery;

export default async function DeliveryCompaniesPage() {
  const companies = await listCompanies();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900">{t.companiesTitle}</h1>
        <Link href="/admin/delivery-companies/new" className="rounded-full bg-brand-700 px-5 py-2 font-bold text-white">
          {ar.admin.add}
        </Link>
      </div>
      {companies.length === 0 ? (
        <p className="rounded-2xl bg-paper p-8 text-center text-brand-700">{t.companiesEmpty}</p>
      ) : (
        <ul className="divide-y divide-brand-100 rounded-2xl bg-paper">
          {companies.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <span className="min-w-0 flex-1 break-words font-bold text-brand-900">
                {c.name}
                {!c.is_active && <span className="ms-2 rounded-full bg-ink/10 px-2 py-0.5 text-xs font-bold text-ink/70">{t.inactive}</span>}
              </span>
              <span dir="ltr" className="text-sm text-ink/70">
                {c.whatsapp}
              </span>
              <span className="text-sm text-ink/70">{t.pricesCount.replace("{n}", String(Object.keys(c.prices).length))}</span>
              <Link href={`/admin/delivery-companies/${c.id}`} className="rounded-full border-2 border-brand-700 px-4 py-1.5 text-sm font-bold text-brand-700">
                {ar.admin.edit}
              </Link>
              <DeleteButton action={deleteCompanyAction.bind(null, c.id)} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
