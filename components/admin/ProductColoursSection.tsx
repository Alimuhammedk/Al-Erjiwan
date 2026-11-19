"use client";

import { useMemo, useState } from "react";
import { ar } from "@/content/ar";
import { readableTextOn } from "@/lib/colours/hex";
import { matchesSearch } from "@/lib/admin/stock";
import type { PickableColour } from "./ColourPicker";

const t = ar.admin.form.colours;
const SHOWN = 120;

export type ColourChoice = { all: boolean; ids: string[] };

type Props = {
  colours: PickableColour[];
  value: ColourChoice;
  onChange: (value: ColourChoice) => void;
  error?: string;
};

// For a mixed paint: offer every catalogue colour, or only the ones ticked here (one by one, or a whole family at once).
export function ProductColoursSection({ colours, value, onChange, error }: Props) {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const families = useMemo(() => [...new Set(colours.map((c) => c.family).filter((f): f is string => Boolean(f)))].sort((a, b) => a.localeCompare(b, "ar")), [colours]);
  const matching = useMemo(
    () => colours.filter((c) => (!family || c.family === family) && matchesSearch({ name: `${c.name_ar} ${c.code ?? ""}`, size: null }, q)),
    [colours, q, family],
  );
  const chosen = new Set(value.ids);

  const setIds = (ids: Iterable<string>) => onChange({ all: false, ids: [...new Set(ids)] });
  const toggle = (id: string) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setIds(next);
  };
  const chip = "inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold";
  const small = "min-h-10 rounded-full border-2 border-brand-700 px-4 text-sm font-bold text-brand-700 hover:bg-brand-50";

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
        <div className="space-y-3 rounded-xl border border-brand-100 p-3">
          {colours.length === 0 ? (
            <p className="text-ink/70">{t.noCatalogue}</p>
          ) : (
            <>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.search}
                aria-label={t.search}
                className="h-11 w-full rounded-xl border border-brand-100 bg-paper px-4 focus:border-brand-500 focus:outline-none"
              />
              {families.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t.families}>
                  <button type="button" aria-pressed={family === null} onClick={() => setFamily(null)} className={`${chip} ${family === null ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700"}`}>
                    {t.allFamilies}
                  </button>
                  {families.map((f) => (
                    <button key={f} type="button" aria-pressed={family === f} onClick={() => setFamily(f)} className={`${chip} ${family === f ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={small} onClick={() => setIds([...chosen, ...matching.map((c) => c.id)])}>
                  {t.selectShown.replace("{n}", String(matching.length))}
                </button>
                <button type="button" className={small} onClick={() => { const drop = new Set(matching.map((c) => c.id)); setIds([...chosen].filter((id) => !drop.has(id))); }}>
                  {t.unselectShown}
                </button>
                <button type="button" className={small} onClick={() => setIds([])}>
                  {t.clearAll}
                </button>
                <span data-testid="colour-count" className="text-sm font-bold text-brand-700">
                  {t.count.replace("{n}", String(chosen.size))}
                </span>
              </div>
              {matching.length === 0 ? (
                <p role="status" className="text-ink/70">{t.none}</p>
              ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {matching.slice(0, SHOWN).map((c) => (
                    <li key={c.id}>
                      <label className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 p-2 ${chosen.has(c.id) ? "border-brand-700 bg-brand-50" : "border-brand-100"}`}>
                        <input type="checkbox" checked={chosen.has(c.id)} onChange={() => toggle(c.id)} className="size-5 shrink-0 accent-[#602f8a]" />
                        <span style={{ backgroundColor: c.hex, color: readableTextOn(c.hex) }} className="size-7 shrink-0 rounded-full border border-ink/15" aria-hidden="true" />
                        <span className="min-w-0 text-sm">
                          <span className="block break-words font-bold text-brand-900">{c.name_ar}</span>
                          {c.code && <span dir="ltr" className="block text-start text-xs text-ink/60">{c.code}</span>}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {matching.length > SHOWN && <p className="text-sm text-ink/70">{t.more.replace("{n}", String(SHOWN))}</p>}
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className="font-semibold text-coral-500">{error}</p>}
    </div>
  );
}
