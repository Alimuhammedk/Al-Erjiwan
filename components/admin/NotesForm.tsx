"use client";

import { useState, type FormEvent } from "react";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { FormField, inputClass } from "./FormField";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";

const t = ar.admin.orders;

type Props = {
  initial: { delivery_notes: string | null };
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
};

// The one notes box: what the delivery company should know. Saving keeps what was typed and says it was saved.
export function NotesForm({ initial, action }: Props) {
  const { state, onSubmit, pending } = useFormAction(action, {} as ActionState);
  const [submitted, setSubmitted] = useState(false);
  const err = state.errors ?? {};
  const saved = submitted && !pending && !state.error && !state.errors;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    setSubmitted(true);
    onSubmit(e);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField label={t.deliveryNotes} error={err.delivery_notes}>
        <textarea name="delivery_notes" rows={3} defaultValue={initial.delivery_notes ?? ""} maxLength={1000} className={inputClass} />
      </FormField>
      {state.error && (
        <p role="alert" className="font-semibold text-coral-500">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <SubmitButton label={t.saveNotes} pending={pending} />
        {saved && (
          <span role="status" className="font-semibold text-brand-700">
            {t.saved}
          </span>
        )}
      </div>
    </form>
  );
}
