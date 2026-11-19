"use client";

import { useState, useTransition } from "react";
import { saveVariantsAction } from "@/app/admin/(protected)/products/extras";
import { ar } from "@/content/ar";
import type { Colour } from "@/types/db";
import { inputClass } from "./FormField";

export type VariantRow = { id: string; size_label: string; price: string; stock: string; colour_id: string };

type Props = { productId: string; initial: VariantRow[]; colours: Pick<Colour, "id" | "name_ar">[] };

const blank = (): VariantRow => ({ id: "", size_label: "", price: "", stock: "0", colour_id: "" });

export function VariantsEditor({ productId, initial, colours }: Props) {
  const [rows, setRows] = useState<VariantRow[]>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const t = ar.admin.products;

  const set = (i: number, key: keyof VariantRow, value: string) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [key]: value } : row)));

  function save() {
    start(async () => {
      const r = await saveVariantsAction(productId, rows);
      setErrors(r.errors ?? {});
      setMessage(r.error ?? (r.errors ? null : ar.admin.saved));
    });
  }

  return (
    <section className="max-w-2xl space-y-4 rounded-2xl bg-paper p-6">
      <h2 className="text-lg font-extrabold text-brand-900">{t.sizes}</h2>
      {rows.map((row, i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-brand-100 p-3 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <input aria-label={t.sizeLabel} placeholder={t.sizeLabel} value={row.size_label} onChange={(e) => set(i, "size_label", e.target.value)} className={inputClass} />
            {errors[`${i}.size_label`] && <p role="alert" className="text-sm font-semibold text-coral-500">{errors[`${i}.size_label`]}</p>}
          </div>
          <div>
            <input aria-label={ar.admin.products.basePrice} placeholder={t.basePrice} inputMode="numeric" value={row.price} onChange={(e) => set(i, "price", e.target.value)} className={inputClass} />
            {errors[`${i}.price`] && <p role="alert" className="text-sm font-semibold text-coral-500">{errors[`${i}.price`]}</p>}
          </div>
          <div>
            <input aria-label={t.stock} placeholder={t.stock} inputMode="numeric" value={row.stock} onChange={(e) => set(i, "stock", e.target.value)} className={inputClass} />
            {errors[`${i}.stock`] && <p role="alert" className="text-sm font-semibold text-coral-500">{errors[`${i}.stock`]}</p>}
          </div>
          <div className="flex gap-2">
            <select aria-label={t.colour} value={row.colour_id} onChange={(e) => set(i, "colour_id", e.target.value)} className={inputClass}>
              <option value="">{t.colour}</option>
              {colours.map((c) => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
            </select>
            <button type="button" aria-label={ar.admin.delete} onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className="rounded-xl border border-coral-500 px-3 text-coral-500">×</button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setRows((r) => [...r, blank()])} className="rounded-full border-2 border-brand-700 px-5 py-2 font-bold text-brand-700">
          {t.addSize}
        </button>
        <button type="button" onClick={save} disabled={pending} className="rounded-full bg-brand-700 px-6 py-2 font-bold text-white disabled:opacity-60">
          {ar.admin.save}
        </button>
        {message && <span role="status" className="font-semibold text-brand-700">{message}</span>}
      </div>
    </section>
  );
}
