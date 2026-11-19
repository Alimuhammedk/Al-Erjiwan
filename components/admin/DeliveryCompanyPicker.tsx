"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ar } from "@/content/ar";
import type { CompanyOption } from "@/lib/admin/delivery";
import type { ActionState } from "@/lib/admin/types";
import { costDifference, deliveryWhatsAppUrl, type AdminOrder } from "@/lib/admin/orders";
import { formatPrice } from "@/lib/format";
import { inputClass } from "./FormField";

const t = ar.admin.orders;

type Props = {
  order: AdminOrder;
  companies: CompanyOption[];
  assign: (companyId: string | null) => Promise<ActionState>;
};

// Pick one of the delivery companies set up in the "شركات التوصيل" tab, see what it charges for this governorate,
// and open WhatsApp to it with the delivery message.
export function DeliveryCompanyPicker({ order, companies, assign }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(companies.some((c) => c.id === order.delivery_company_id) ? (order.delivery_company_id ?? "") : "");
  const company = companies.find((c) => c.id === selected);
  const diff = company ? costDifference(order.delivery_fee, company.price) : null;
  const button = "inline-flex min-h-11 items-center justify-center rounded-full px-5 font-bold";

  function choose(id: string) {
    setSelected(id);
    start(async () => {
      const r = await assign(id || null);
      setError(r.error ?? null);
      if (!r.error) router.refresh();
    });
  }

  if (companies.length === 0) {
    return (
      <p className="text-sm text-ink/70">
        {t.noCompaniesYet}.{" "}
        <Link href="/admin/delivery-companies/new" className="font-bold text-brand-700 underline">
          {t.addCompanies}
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-brand-900">{t.company}</span>
        <select value={selected} disabled={pending} onChange={(e) => choose(e.target.value)} className={inputClass}>
          <option value="">{t.chooseCompany}</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {company && (
        <dl className="space-y-1 rounded-xl bg-brand-50 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink/70">{t.companyPrice}</dt>
            <dd data-testid="company-price" className="font-bold">
              {company.price === null ? t.noCompanyPrice : formatPrice(company.price)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink/70">{t.customerPaidDelivery}</dt>
            <dd className="font-bold">{formatPrice(order.delivery_fee)}</dd>
          </div>
          {diff !== null && (
            <div className="flex justify-between gap-3 border-t border-brand-100 pt-1">
              <dt className="text-ink/70">{t.difference}</dt>
              <dd data-testid="company-difference" dir="ltr" className={`font-bold ${diff < 0 ? "text-coral-500" : "text-brand-700"}`}>
                {diff < 0 ? "-" : ""}
                {formatPrice(Math.abs(diff))}
              </dd>
            </div>
          )}
        </dl>
      )}

      {company ? (
        <a href={deliveryWhatsAppUrl(order, company)} target="_blank" rel="noopener noreferrer" className={`${button} w-full bg-brand-700 text-white hover:bg-brand-900`}>
          {t.deliveryWhatsApp}
        </a>
      ) : (
        <button type="button" disabled title={t.pickCompanyFirst} className={`${button} w-full bg-brand-700 text-white opacity-50`}>
          {t.deliveryWhatsApp}
        </button>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-coral-500/10 px-3 py-2 font-semibold text-coral-500">
          {error}
        </p>
      )}
    </div>
  );
}
