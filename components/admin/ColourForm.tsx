"use client";

import Link from "next/link";
import { useState } from "react";
import { ar } from "@/content/ar";
import type { AdminColour } from "@/lib/admin/colours-data";
import type { ActionState } from "@/lib/admin/types";
import { normaliseHex } from "@/lib/colours/hex";
import { FormField, inputClass } from "./FormField";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";

const t = ar.admin.colours;

type Props = { action: (prev: ActionState, formData: FormData) => Promise<ActionState>; initial?: AdminColour };

// One colour: names, system, code, family and the approximate screen colour (a colour box and a typed box kept in step).
export function ColourForm({ action, initial }: Props) {
  const { state, onSubmit, pending } = useFormAction(action, {} as ActionState);
  const [hex, setHex] = useState(initial?.hex ?? "#cccccc");
  const err = state.errors ?? {};
  const valid = normaliseHex(hex);

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5 rounded-2xl bg-paper p-6">
      <FormField label={t.nameAr} error={err.name_ar}>
        <input name="name_ar" defaultValue={initial?.name_ar} maxLength={100} className={inputClass} />
      </FormField>
      <FormField label={t.nameEn} error={err.name_en}>
        <input name="name_en" dir="ltr" defaultValue={initial?.name_en ?? ""} maxLength={100} className={`${inputClass} text-start`} />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={t.system} error={err.system}>
          <input name="system" dir="ltr" defaultValue={initial?.system ?? ""} maxLength={50} className={`${inputClass} text-start`} />
        </FormField>
        <FormField label={t.code} error={err.code}>
          <input name="code" dir="ltr" defaultValue={initial?.code ?? ""} maxLength={40} className={`${inputClass} text-start`} />
        </FormField>
      </div>
      <FormField label={t.family} error={err.family}>
        <input name="family" defaultValue={initial?.family ?? ""} maxLength={40} className={inputClass} />
      </FormField>

      <div>
        <span className="mb-1 block font-semibold text-brand-900">{t.hex}</span>
        <div className="flex items-center gap-3">
          <input
            type="color"
            aria-label={t.hex}
            value={valid ?? "#cccccc"}
            onChange={(e) => setHex(e.target.value)}
            className="size-12 shrink-0 cursor-pointer rounded-xl border border-brand-100 bg-paper p-1"
          />
          <input
            name="hex_text"
            dir="ltr"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            aria-label={t.hexText}
            maxLength={7}
            className={`${inputClass} text-start`}
          />
        </div>
        {err.hex && (
          <p role="alert" className="mt-1 text-sm font-semibold text-coral-500">
            {err.hex}
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="font-semibold text-coral-500">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} />
        <Link href="/admin/colours" className="font-bold text-brand-700">
          {ar.admin.cancel}
        </Link>
      </div>
    </form>
  );
}
