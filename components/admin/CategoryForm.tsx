"use client";

import Link from "next/link";
import { useState } from "react";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import type { Category } from "@/types/db";
import { FormField, inputClass } from "./FormField";
import { ImageUploader } from "./ImageUploader";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";

type Props = { action: (prev: ActionState, formData: FormData) => Promise<ActionState>; initial?: Category };

export function CategoryForm({ action, initial }: Props) {
  const { state, onSubmit, pending } = useFormAction(action, {} as ActionState);
  const [images, setImages] = useState<string[]>(initial?.image_url ? [initial.image_url] : []);
  const err = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5 rounded-2xl bg-paper p-6">
      <FormField label={ar.admin.categories.nameAr} error={err.name_ar}>
        <input name="name_ar" defaultValue={initial?.name_ar} required maxLength={200} className={inputClass} />
      </FormField>
      <FormField label={ar.admin.categories.nameEn} error={err.name_en}>
        <input name="name_en" dir="ltr" defaultValue={initial?.name_en ?? ""} maxLength={200} className={`${inputClass} text-start`} />
      </FormField>
      <FormField label={ar.admin.categories.order} error={err.sort_order}>
        <input name="sort_order" inputMode="numeric" defaultValue={initial?.sort_order ?? 0} className={inputClass} />
      </FormField>
      <div>
        <span className="mb-1 block font-semibold text-brand-900">{ar.admin.categories.image}</span>
        <ImageUploader folder="categories" value={images} onChange={setImages} />
        <input type="hidden" name="image_url" value={images[0] ?? ""} />
        {err.image_url && <p role="alert" className="mt-1 text-sm font-semibold text-coral-500">{err.image_url}</p>}
      </div>
      {state.error && <p role="alert" className="font-semibold text-coral-500">{state.error}</p>}
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} />
        <Link href="/admin/storefront" className="font-bold text-brand-700">{ar.admin.cancel}</Link>
      </div>
    </form>
  );
}
