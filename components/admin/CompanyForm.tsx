"use client";

import Link from "next/link";
import { ar } from "@/content/ar";
import type { CompanyRow } from "@/lib/admin/delivery-data";
import type { ActionState } from "@/lib/admin/types";
import { FormField, inputClass } from "./FormField";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";

const t = ar.admin.delivery;

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: CompanyRow;
};

// A delivery company: name, WhatsApp number and notes.
export function CompanyForm({ action, initial }: Props) {
  const { state, onSubmit, pending } = useFormAction(action, {} as ActionState);
  const err = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
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

      {state.error && (
        <p role="alert" className="font-semibold text-coral-500">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} />
        <Link href="/admin/delivery" className="font-bold text-brand-700">
          {ar.admin.cancel}
        </Link>
      </div>
    </form>
  );
}
