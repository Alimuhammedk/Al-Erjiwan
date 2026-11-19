"use client";

import Link from "next/link";
import { useState } from "react";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import type { Banner } from "@/types/db";
import { FormField, inputClass } from "./FormField";
import { ImageUploader } from "./ImageUploader";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";

type Props = { action: (prev: ActionState, formData: FormData) => Promise<ActionState>; initial?: Banner };

export function BannerForm({ action, initial }: Props) {
  const { state, onSubmit, pending } = useFormAction(action, {} as ActionState);
  const [images, setImages] = useState<string[]>(initial?.image_url ? [initial.image_url] : []);
  const err = state.errors ?? {};
  const t = ar.admin.banners;

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5 rounded-2xl bg-paper p-6">
      <div>
        <span className="mb-1 block font-semibold text-brand-900">{t.image}</span>
        <ImageUploader folder="banners" value={images} onChange={setImages} />
        <input type="hidden" name="image_url" value={images[0] ?? ""} />
        {err.image_url && <p role="alert" className="mt-1 text-sm font-semibold text-coral-500">{err.image_url}</p>}
      </div>
      <FormField label={t.titleField} error={err.title}>
        <input name="title" defaultValue={initial?.title ?? ""} maxLength={200} className={inputClass} />
      </FormField>
      <FormField label={t.titleEn} error={err.title_en}>
        <input name="title_en" dir="ltr" defaultValue={initial?.title_en ?? ""} maxLength={200} className={`${inputClass} text-start`} />
      </FormField>
      <FormField label={t.link} error={err.link}>
        <input name="link" dir="ltr" defaultValue={initial?.link ?? ""} placeholder="/shop" className={`${inputClass} text-start`} />
      </FormField>
      <FormField label={t.order} error={err.sort_order}>
        <input name="sort_order" inputMode="numeric" defaultValue={initial?.sort_order ?? 0} className={inputClass} />
      </FormField>
      <label className="flex items-center gap-3">
        <input type="checkbox" name="is_active" defaultChecked={initial?.is_active ?? true} className="size-5 accent-[#602f8a]" />
        <span className="font-semibold text-brand-900">{t.active}</span>
      </label>
      {state.error && <p role="alert" className="font-semibold text-coral-500">{state.error}</p>}
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} />
        <Link href="/admin/banners" className="font-bold text-brand-700">{ar.admin.cancel}</Link>
      </div>
    </form>
  );
}
