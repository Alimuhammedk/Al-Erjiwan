"use client";

import { useRef, useState, type FormEvent } from "react";
import { ar } from "@/content/ar";
import type { AdminZone } from "@/lib/admin/delivery-data";
import type { ActionState } from "@/lib/admin/types";
import { inputClass } from "./FormField";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";

const t = ar.admin.delivery;

type Props = { zones: AdminZone[]; action: (prev: ActionState, formData: FormData) => Promise<ActionState> };

// One table for every governorate and one save button. The "same price for all" box only fills in the fee boxes;
// nothing is saved until the owner presses save.
export function DeliveryFeesForm({ zones, action }: Props) {
  const { state, onSubmit, pending } = useFormAction(action, {} as ActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const [all, setAll] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const err = state.errors ?? {};
  const saved = submitted && !pending && !state.error && !state.errors;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    setSubmitted(true);
    onSubmit(e);
  };
  const fillAll = () => {
    formRef.current?.querySelectorAll<HTMLInputElement>('input[name^="fee_"]').forEach((i) => {
      i.value = all;
    });
  };
  const cell = `${inputClass} min-w-0 py-2 text-start`;

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-5">
      <input type="hidden" name="ids" value={zones.map((z) => z.id).join(",")} />
      <p className="text-ink/80">{t.feesHelp}</p>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-paper p-4">
        <label className="block min-w-40 flex-1">
          <span className="mb-1 block text-sm font-semibold text-brand-900">{t.setAllLabel}</span>
          <input value={all} onChange={(e) => setAll(e.target.value)} inputMode="numeric" dir="ltr" aria-label={t.setAllLabel} className={cell} />
        </label>
        <button type="button" onClick={fillAll} className="min-h-11 rounded-full border-2 border-brand-700 px-5 font-bold text-brand-700 hover:bg-brand-50">
          {t.setAll}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-paper">
        <table className="w-full min-w-[34rem] text-start">
          <thead>
            <tr className="border-b border-brand-100 text-sm text-ink/70">
              <th className="p-3 text-start font-semibold">{t.governorate}</th>
              <th className="p-3 text-start font-semibold">{t.fee}</th>
              <th className="p-3 text-start font-semibold">{t.minOrder}</th>
              <th className="p-3 text-start font-semibold">{t.active}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {zones.map((z) => (
              <tr key={z.id}>
                <td className="p-3 font-bold text-brand-900">{z.governorate_ar}</td>
                <td className="p-3">
                  <input name={`fee_${z.id}`} defaultValue={z.fee} inputMode="numeric" dir="ltr" aria-label={`${t.fee} ${z.governorate_ar}`} className={cell} />
                  {err[`fee_${z.id}`] && <span role="alert" className="mt-1 block text-sm font-semibold text-coral-500">{err[`fee_${z.id}`]}</span>}
                </td>
                <td className="p-3">
                  <input name={`min_${z.id}`} defaultValue={z.min_order} inputMode="numeric" dir="ltr" aria-label={`${t.minOrder} ${z.governorate_ar}`} className={cell} />
                  {err[`min_${z.id}`] && <span role="alert" className="mt-1 block text-sm font-semibold text-coral-500">{err[`min_${z.id}`]}</span>}
                </td>
                <td className="p-3">
                  <input name={`active_${z.id}`} type="checkbox" defaultChecked={z.is_active} aria-label={`${t.active} ${z.governorate_ar}`} className="size-6 accent-brand-700" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(state.error || err.form) && (
        <p role="alert" className="font-semibold text-coral-500">
          {state.error ?? err.form}
        </p>
      )}
      <div className="flex items-center gap-3">
        <SubmitButton label={t.saveFees} pending={pending} />
        {saved && (
          <span role="status" className="font-semibold text-brand-700">
            {t.saved}
          </span>
        )}
      </div>
    </form>
  );
}
