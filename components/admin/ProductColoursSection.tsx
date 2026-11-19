"use client";

import { ar } from "@/content/ar";
import { ColourChecklist } from "./ColourChecklist";
import type { PickableColour } from "./ColourPicker";

const t = ar.admin.form.colours;

export type ColourChoice = { all: boolean; ids: string[] };

type Props = {
  colours: PickableColour[];
  value: ColourChoice;
  onChange: (value: ColourChoice) => void;
  error?: string;
};

// For a mixed paint: offer every catalogue colour, or only the ones ticked here (one by one, or a whole family at once).
export function ProductColoursSection({ colours, value, onChange, error }: Props) {
  return (
    <div className="space-y-4" data-testid="product-colours">
      <input type="hidden" name="colour_ids" value={JSON.stringify(value.ids)} />
      <fieldset className="space-y-1">
        <legend className="sr-only">{t.title}</legend>
        <label className="flex min-h-11 items-center gap-3">
          <input type="radio" name="colour_mode" value="all" checked={value.all} onChange={() => onChange({ all: true, ids: value.ids })} className="size-5 accent-[#602f8a]" />
          <span className="font-semibold text-brand-900">{t.all}</span>
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input type="radio" name="colour_mode" value="some" checked={!value.all} onChange={() => onChange({ all: false, ids: value.ids })} className="size-5 accent-[#602f8a]" />
          <span className="font-semibold text-brand-900">{t.some}</span>
        </label>
      </fieldset>

      {!value.all && (
        <div className="rounded-xl border border-brand-100 p-3">
          <ColourChecklist colours={colours} ids={value.ids} onChange={(ids) => onChange({ all: false, ids })} />
        </div>
      )}
      {error && (
        <p role="alert" className="font-semibold text-coral-500">
          {error}
        </p>
      )}
    </div>
  );
}
