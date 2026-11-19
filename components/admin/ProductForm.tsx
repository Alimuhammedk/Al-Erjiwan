"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import type { Category, Product } from "@/types/db";
import { FormField, inputClass } from "./FormField";
import { SubmitButton } from "./SubmitButton";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Pick<Category, "id" | "name_ar">[];
  initial?: Product;
};

function Switch({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 accent-[#602f8a]" />
      <span className="font-semibold text-brand-900">{label}</span>
    </label>
  );
}

export function ProductForm({ action, categories, initial }: Props) {
  const [state, formAction] = useActionState(action, {});
  const err = state.errors ?? {};
  const t = ar.admin.products;

  return (
    <form action={formAction} className="max-w-2xl space-y-5 rounded-2xl bg-paper p-6">
      <FormField label={t.nameAr} error={err.name_ar}>
        <input name="name_ar" defaultValue={initial?.name_ar} required maxLength={200} className={inputClass} />
      </FormField>
      <FormField label={t.nameEn} error={err.name_en}>
        <input name="name_en" dir="ltr" defaultValue={initial?.name_en ?? ""} maxLength={200} className={`${inputClass} text-start`} />
      </FormField>
      <FormField label={t.description} error={err.description}>
        <textarea name="description" rows={4} defaultValue={initial?.description ?? ""} maxLength={5000} className={inputClass} />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={t.category} error={err.category_id}>
          <select name="category_id" defaultValue={initial?.category_id ?? ""} className={inputClass}>
            <option value="">{t.noCategory}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ar}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t.brand} error={err.brand}>
          <input name="brand" defaultValue={initial?.brand ?? ""} maxLength={100} className={inputClass} />
        </FormField>
        <FormField label={t.basePrice} error={err.base_price}>
          <input name="base_price" inputMode="numeric" defaultValue={initial?.base_price} required className={inputClass} />
          <span className="mt-1 block text-xs text-ink/70">{t.basePriceHint}</span>
        </FormField>
        <FormField label={t.finish} error={err.finish}>
          <select name="finish" defaultValue={initial?.finish ?? ""} className={inputClass}>
            <option value="">{t.noFinish}</option>
            {ar.options.finishes.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t.salePrice} error={err.sale_price}>
          <input name="sale_price" inputMode="numeric" defaultValue={initial?.sale_price ?? ""} className={inputClass} />
        </FormField>
        <FormField label={t.stock} error={err.stock}>
          <input name="stock" inputMode="numeric" defaultValue={initial?.stock ?? 0} className={inputClass} />
        </FormField>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold text-brand-900">{t.rooms}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {ar.options.rooms.map((room) => (
            <label key={room} className="flex items-center gap-2">
              <input type="checkbox" name="rooms" value={room} defaultChecked={initial?.rooms?.includes(room)} className="size-5 accent-[#602f8a]" />
              <span>{room}</span>
            </label>
          ))}
        </div>
        {err.rooms && <p role="alert" className="text-sm font-semibold text-coral-500">{err.rooms}</p>}
      </fieldset>
      <div className="space-y-3">
        <Switch name="is_active" label={t.active} defaultChecked={initial?.is_active ?? true} />
        <Switch name="is_featured" label={t.featured} defaultChecked={initial?.is_featured ?? false} />
        <Switch name="is_tintable" label={t.tintable} defaultChecked={initial?.is_tintable ?? false} />
      </div>
      {state.error && <p role="alert" className="font-semibold text-coral-500">{state.error}</p>}
      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link href="/admin/products" className="font-bold text-brand-700">{ar.admin.cancel}</Link>
      </div>
    </form>
  );
}
