"use client";

import { useState } from "react";
import { ar } from "@/content/ar";
import { addColourLines, takenColours } from "@/lib/admin/variant-colours";
import { ColourChecklist } from "./ColourChecklist";
import { ColourPicker, type PickableColour } from "./ColourPicker";
import { inputClass } from "./FormField";

export type VariantRow = { id: string; size_label: string; price: string; stock: string; colour_id: string };

type Props = {
  rows: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
  colours: PickableColour[];
  errors: Record<string, string>; // keys like "variants.0.price"
};

export const blankVariant = (): VariantRow => ({ id: "", size_label: "", price: "", stock: "0", colour_id: "" });

// The sizes table. It only holds the rows; saving happens with the rest of the product, in one go.
export function VariantsEditor({ rows, onChange, colours, errors }: Props) {
  const t = ar.admin.form;
  const set = (i: number, key: keyof VariantRow, value: string) =>
    onChange(rows.map((row, j) => (j === i ? { ...row, [key]: value } : row)));
  const err = (i: number, key: string) => errors[`variants.${i}.${key}`];
  // the size line whose "several colours" window is open, and what is ticked in it
  const [multi, setMulti] = useState<{ index: number; ids: string[] } | null>(null);
  // colours not offered again: the ones this size already has on other lines, and this line's own colour
  const taken = multi ? takenColours(rows, multi.index) : new Set<string>();
  if (multi && rows[multi.index]?.colour_id) taken.add(rows[multi.index].colour_id);

  const Err = ({ msg }: { msg?: string }) =>
    msg ? (
      <span role="alert" className="mt-1 block text-sm font-semibold text-coral-500">
        {msg}
      </span>
    ) : null;

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/50 p-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-brand-900">
              {t.sizeN} {i + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              aria-label={`${t.removeSize} ${i + 1}`}
              className="grid size-11 place-items-center rounded-full text-coral-500 hover:bg-coral-500/10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
            <label className="col-span-2 block sm:col-span-3">
              <span className="mb-1 block text-sm font-semibold text-brand-900">{t.sizeLabel}</span>
              <input value={row.size_label} onChange={(e) => set(i, "size_label", e.target.value)} placeholder={t.sizePlaceholder} maxLength={50} className={inputClass} />
              <Err msg={err(i, "size_label")} />
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-sm font-semibold text-brand-900">{t.sizePrice}</span>
              <input value={row.price} onChange={(e) => set(i, "price", e.target.value)} inputMode="numeric" className={inputClass} />
              <Err msg={err(i, "price")} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-brand-900">{t.sizeStock}</span>
              <input value={row.stock} onChange={(e) => set(i, "stock", e.target.value)} inputMode="numeric" className={inputClass} />
              <Err msg={err(i, "stock")} />
            </label>
            <div className="col-span-2 sm:col-span-4">
              <span className="mb-1 block text-sm font-semibold text-brand-900">{t.colour}</span>
              <ColourPicker value={row.colour_id} onChange={(id) => set(i, "colour_id", id)} colours={colours} label={`${t.colour} ${i + 1}`} />
              <Err msg={err(i, "colour_id")} />
            </div>
          </div>
          {colours.length > 0 && (
            <button type="button" onClick={() => setMulti({ index: i, ids: [] })} className="min-h-11 rounded-full px-1 text-sm font-bold text-brand-700 underline">
              {t.addManyColours}
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, blankVariant()])}
        className="min-h-11 rounded-full border-2 border-brand-700 px-5 font-bold text-brand-700 hover:bg-brand-50"
      >
        + {t.addSize}
      </button>

      {multi && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" data-testid="multi-colour-dialog">
          <button type="button" aria-label={t.closeWindow} tabIndex={-1} onClick={() => setMulti(null)} className="absolute inset-0 cursor-default bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={t.addManyColours} className="relative flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-paper shadow-xl md:max-w-2xl md:rounded-3xl">
            <div className="space-y-1 border-b border-brand-100 p-4">
              <h2 className="text-lg font-extrabold text-brand-900">{t.addManyColours}</h2>
              <p className="text-sm text-ink/70">{t.manyHint}</p>
            </div>
            <div className="min-h-40 flex-1 overflow-y-auto p-4">
              <ColourChecklist colours={colours.filter((c) => !taken.has(c.id))} ids={multi.ids} onChange={(ids) => setMulti({ ...multi, ids })} />
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-brand-100 p-4">
              <button
                type="button"
                disabled={multi.ids.length === 0}
                onClick={() => {
                  onChange(addColourLines(rows, multi.index, multi.ids));
                  setMulti(null);
                }}
                className="min-h-11 rounded-full bg-brand-700 px-6 font-bold text-white hover:bg-brand-900 disabled:opacity-50"
              >
                {t.addManyConfirm.replace("{n}", String(multi.ids.length))}
              </button>
              <button type="button" onClick={() => setMulti(null)} className="min-h-11 rounded-full px-4 font-bold text-brand-700 hover:bg-brand-50">
                {t.cancelMany}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
