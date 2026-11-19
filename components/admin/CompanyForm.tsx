"use client";

import Link from "next/link";
import { ar } from "@/content/ar";
import type { AdminZone, CompanyRow } from "@/lib/admin/delivery-data";
import type { ActionState } from "@/lib/admin/types";
import { FormField, inputClass } from "./FormField";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";

const t = ar.admin.delivery;

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  zones: AdminZone[];
  initial?: CompanyRow;
};

// A delivery company: name, WhatsApp number, notes, and what it charges for each governorate. One save for all of it.
export function CompanyForm({ action, zones, initial }: Props) {
  const { state, onSubmit, pending } = useFormAction(action, {} as ActionState);
  const err = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
      <input type="hidden" name="ids" value={zones.map((z) => z.id).join(",")} />

      <section className="space-y-5 rounded-2xl bg-paper p-5 sm:p-6">
        <FormField label={t.companyName} error={err.name}>
          <input name="name" defaultValue={initial?.name} maxLength={100} className={inputClass} />
        </FormField>
        <FormField label={t.companyWhatsapp} error={err.whatsapp}>
          <input name="whatsapp" type="tel" inputMode="tel" dir="ltr" defaultValue={initial?.whatsapp} maxLength={25} className={`${inputClass} text-start`} />
        </FormField>
        <FormField label={t.companyNotes} error={err.notes}>
          <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} maxLength={1000} className={inputClass} />
        </FormField>
        <label className="flex min-h-11 items-center gap-3 font-semibold text-brand-900">
          <input name="is_active" type="checkbox" defaultChecked={initial?.is_active ?? true} className="size-6 accent-brand-700" />
          {t.companyActive}
        </label>
      </section>

      <section className="space-y-4 rounded-2xl bg-paper p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-extrabold text-brand-900">{t.pricesTitle}</h2>
          <p className="text-sm text-ink/70">{t.pricesHelp}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {zones.map((z) => (
            <li key={z.id}>
              <label className="flex items-center gap-3">
                <span className="w-28 shrink-0 font-semibold text-brand-900">{z.governorate_ar}</span>
                <input
                  name={`price_${z.id}`}
                  defaultValue={initial?.prices[z.id] ?? ""}
                  inputMode="numeric"
                  dir="ltr"
                  aria-label={`${t.pricesTitle}: ${z.governorate_ar}`}
                  className={`${inputClass} min-w-0 py-2 text-start`}
                />
              </label>
              {err[`price_${z.id}`] && (
                <span role="alert" className="mt-1 block text-sm font-semibold text-coral-500">
                  {err[`price_${z.id}`]}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {state.error && (
        <p role="alert" className="font-semibold text-coral-500">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} />
        <Link href="/admin/delivery-companies" className="font-bold text-brand-700">
          {ar.admin.cancel}
        </Link>
      </div>
    </form>
  );
}
