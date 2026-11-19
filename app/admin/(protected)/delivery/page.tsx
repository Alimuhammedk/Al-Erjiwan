import Link from "next/link";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { DeliveryFeesForm } from "@/components/admin/DeliveryFeesForm";
import { ar } from "@/content/ar";
import { getAdminZones, listCompanies } from "@/lib/admin/delivery-data";
import { deleteCompanyAction } from "../delivery-companies/actions";
import { saveZonesAction } from "../delivery-fees/actions";

export const dynamic = "force-dynamic";
const t = ar.admin.delivery;

// One tab for everything about delivery: what customers pay per governorate, and the delivery companies.
export default async function DeliveryPage() {
  const [zones, companies] = await Promise.all([getAdminZones(), listCompanies()]);
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-8">
      <h1 className="sr-only">{t.title}</h1>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold text-brand-900">{t.feesTitle}</h2>
        <DeliveryFeesForm zones={zones} action={saveZonesAction} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-brand-900">{t.companiesTitle}</h2>
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
                <Link href={`/admin/delivery-companies/${c.id}`} className="rounded-full border-2 border-brand-700 px-4 py-1.5 text-sm font-bold text-brand-700">
                  {ar.admin.edit}
                </Link>
                <DeleteButton action={deleteCompanyAction.bind(null, c.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
