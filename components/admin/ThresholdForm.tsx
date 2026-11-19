"use client";

import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { inputClass } from "./FormField";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";

const t = ar.admin.stock;

// The "low stock" level: at or below this number a product is shown as low.
export function ThresholdForm({ value, action }: { value: number; action: (prev: ActionState, formData: FormData) => Promise<ActionState> }) {
  const { state, onSubmit, pending } = useFormAction(action, {} as ActionState);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded-2xl bg-paper p-4">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-brand-900">{t.lowLevel}</span>
        <input name="threshold" defaultValue={value} inputMode="numeric" dir="ltr" className={`${inputClass} w-28 py-2 text-start`} />
      </label>
      <SubmitButton label={t.saveLevel} pending={pending} />
      {(state.errors?.threshold ?? state.error) && (
        <span role="alert" className="font-semibold text-coral-500">
          {state.errors?.threshold ?? state.error}
        </span>
      )}
    </form>
  );
}
