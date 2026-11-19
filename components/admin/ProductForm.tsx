"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ar } from "@/content/ar";
import type { ProductSaveState } from "@/lib/admin/types";
import type { Category, Product } from "@/types/db";
import type { PickableColour } from "./ColourPicker";
import { FormField, inputClass } from "./FormField";
import { ImageUploader } from "./ImageUploader";
import { ProductColoursSection, type ColourChoice } from "./ProductColoursSection";
import { SubmitButton } from "./SubmitButton";
import { blankVariant, VariantsEditor, type VariantRow } from "./VariantsEditor";
import { useFormAction } from "./useFormAction";

type Props = {
  action: (prev: ProductSaveState, formData: FormData) => Promise<ProductSaveState>;
  categories: Pick<Category, "id" | "name_ar">[];
  colours: PickableColour[];
  initial?: { product: Product; images: string[]; variants: VariantRow[]; colourChoice?: ColourChoice };
};

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl bg-paper p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-extrabold text-brand-900">{title}</h2>
        {hint && <p className="mt-1 text-sm text-ink/70">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Switch({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 accent-[#602f8a]" />
      <span className="font-semibold text-brand-900">{label}</span>
    </label>
  );
}

// One form, one save: details, photos, price and sizes together.
export function ProductForm({ action, categories, colours, initial }: Props) {
  const { state, onSubmit, pending } = useFormAction(action, {} as ProductSaveState);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [hasSizes, setHasSizes] = useState((initial?.variants.length ?? 0) > 0);
  const [rows, setRows] = useState<VariantRow[]>(initial?.variants ?? []);
  const [tintable, setTintable] = useState(initial?.product.is_tintable ?? false);
  const [choice, setChoice] = useState<ColourChoice>(initial?.colourChoice ?? { all: true, ids: [] });
  const err = state.errors ?? {};
  const p = initial?.product;
  const t = ar.admin.products;
  const f = ar.admin.form;
  // After a partly failed save the product already exists: later saves must update it, not create a copy.
  const productId = state.savedId ?? p?.id ?? "";

  function toggleSizes(on: boolean) {
    if (!on && rows.length > 0 && !confirm(f.confirmRemoveSizes)) return;
    if (on && rows.length === 0) setRows([blankVariant()]);
    setHasSizes(on);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-4xl space-y-5">
      <input type="hidden" name="id" value={productId} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="variants" value={JSON.stringify(rows)} />

      <Section title={f.basics}>
        <FormField label={t.nameAr} error={err.name_ar}>
          <input name="name_ar" defaultValue={p?.name_ar} required maxLength={200} className={inputClass} />
        </FormField>
        <FormField label={t.nameEn} error={err.name_en}>
          <input name="name_en" dir="ltr" defaultValue={p?.name_en ?? ""} maxLength={200} className={`${inputClass} text-start`} />
        </FormField>
        <FormField label={t.description} error={err.description}>
          <textarea name="description" rows={4} defaultValue={p?.description ?? ""} maxLength={5000} className={inputClass} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.category} error={err.category_id}>
            <select name="category_id" defaultValue={p?.category_id ?? ""} className={inputClass}>
              <option value="">{t.noCategory}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t.brand} error={err.brand}>
            <input name="brand" defaultValue={p?.brand ?? ""} maxLength={100} className={inputClass} />
          </FormField>
          <FormField label={t.finish} error={err.finish}>
            <select name="finish" defaultValue={p?.finish ?? ""} className={inputClass}>
              <option value="">{t.noFinish}</option>
              {ar.options.finishes.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1 font-semibold text-brand-900">{t.rooms}</legend>
          <div className="flex flex-wrap gap-x-5">
            {ar.options.rooms.map((room) => (
              <label key={room} className="flex min-h-11 items-center gap-2">
                <input type="checkbox" name="rooms" value={room} defaultChecked={p?.rooms?.includes(room)} className="size-5 accent-[#602f8a]" />
                <span>{room}</span>
              </label>
            ))}
          </div>
          {err.rooms && <p role="alert" className="text-sm font-semibold text-coral-500">{err.rooms}</p>}
        </fieldset>
      </Section>

      <Section title={f.photos} hint={f.photosHint}>
        <ImageUploader folder="products" value={images} onChange={setImages} multiple />
        {err.images && <p role="alert" className="text-sm font-semibold text-coral-500">{err.images}</p>}
      </Section>

      <Section title={f.pricing}>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="has_sizes" checked={hasSizes} onChange={(e) => toggleSizes(e.target.checked)} className="size-5 accent-[#602f8a]" />
          <span className="font-semibold text-brand-900">{f.hasSizes}</span>
        </label>

        {hasSizes ? (
          <>
            <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">{f.priceBySize}</p>
            <VariantsEditor rows={rows} onChange={setRows} colours={colours} errors={err} />
            {err.variants && <p role="alert" className="font-semibold text-coral-500">{err.variants}</p>}
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={f.price} error={err.base_price}>
              <input name="base_price" inputMode="numeric" defaultValue={p?.base_price} className={inputClass} />
            </FormField>
            <FormField label={t.salePrice} error={err.sale_price}>
              <input name="sale_price" inputMode="numeric" defaultValue={p?.sale_price ?? ""} className={inputClass} />
            </FormField>
            <FormField label={t.stock} error={err.stock}>
              <input name="stock" inputMode="numeric" defaultValue={p?.stock ?? 0} className={inputClass} />
            </FormField>
          </div>
        )}
      </Section>

      <Section title={f.settings}>
        <Switch name="is_active" label={t.active} defaultChecked={p?.is_active ?? true} />
        <Switch name="is_featured" label={t.featured} defaultChecked={p?.is_featured ?? false} />
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="is_tintable" checked={tintable} onChange={(e) => setTintable(e.target.checked)} className="size-5 accent-[#602f8a]" />
          <span className="font-semibold text-brand-900">{t.tintable}</span>
        </label>
      </Section>

      {tintable && (
        <Section title={f.colours.title} hint={f.colours.hint}>
          <ProductColoursSection colours={colours} value={choice} onChange={setChoice} error={err.colours} />
        </Section>
      )}

      <div className="sticky bottom-0 z-20 -mx-4 space-y-2 border-t border-brand-100 bg-paper/95 px-4 py-3 backdrop-blur">
        {state.error && <p role="alert" className="font-semibold text-coral-500">{state.error}</p>}
        <div className="flex items-center gap-4">
          <SubmitButton label={f.saveProduct} pending={pending} />
          <Link href="/admin/products" className="inline-flex min-h-11 items-center font-bold text-brand-700">
            {ar.admin.cancel}
          </Link>
        </div>
      </div>
    </form>
  );
}
