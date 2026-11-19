"use client";

import { useState, type FormEvent } from "react";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { STORE_MAX, type StoreSettings } from "@/lib/store-settings";
import { FormField, inputClass } from "./FormField";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";

const t = ar.admin.store;

type Props = { initial: StoreSettings; action: (prev: ActionState, formData: FormData) => Promise<ActionState> };

// The texts on the homepage's shop-info section. Saving keeps what was typed and says it was saved.
export function StoreInfoForm({ initial, action }: Props) {
  const { state, onSubmit, pending } = useFormAction(action, {} as ActionState);
  const [submitted, setSubmitted] = useState(false);
  const err = state.errors ?? {};
  const saved = submitted && !pending && !state.error && !state.errors;
  const submit = (e: FormEvent<HTMLFormElement>) => {
    setSubmitted(true);
    onSubmit(e);
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-2xl bg-paper p-5 sm:p-6">
      <p className="text-ink/80">{t.help}</p>
      <FormField label={t.guarantee} error={err.guarantee}>
        <textarea name="guarantee" rows={4} defaultValue={initial.guarantee} maxLength={STORE_MAX.guarantee} className={inputClass} />
      </FormField>
      <FormField label={t.hours} error={err.hours}>
        <input name="hours" defaultValue={initial.hours} maxLength={STORE_MAX.hours} className={inputClass} />
      </FormField>
      <FormField label={t.address} error={err.address}>
        <input name="address" defaultValue={initial.address} maxLength={STORE_MAX.address} className={inputClass} />
      </FormField>
      {state.error && (
        <p role="alert" className="font-semibold text-coral-500">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <SubmitButton label={t.save} pending={pending} />
        {saved && (
          <span role="status" className="font-semibold text-brand-700">
            {t.saved}
          </span>
        )}
      </div>
    </form>
  );
}
