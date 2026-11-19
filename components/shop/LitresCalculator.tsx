"use client";

import { useState } from "react";
import { ar } from "@/content/ar";
import { estimateLitres } from "@/lib/shop/product";

// Accepts Arabic digits and the Arabic decimal mark.
function num(s: string): number {
  const ascii = s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٫,]/g, ".")
    .trim();
  return ascii === "" ? Number.NaN : Number(ascii);
}

const input =
  "w-full rounded-xl border border-brand-100 bg-paper px-3 py-2.5 focus:border-brand-500 focus:outline-none";

export function LitresCalculator() {
  const t = ar.product;
  const [v, setV] = useState({ length: "", width: "", height: "", doors: "1", windows: "1", coats: "2" });
  const [result, setResult] = useState<number | null | undefined>(undefined);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  function calculate() {
    setResult(
      estimateLitres({
        length: num(v.length),
        width: num(v.width),
        height: num(v.height),
        doors: num(v.doors),
        windows: num(v.windows),
        coats: num(v.coats),
      }),
    );
  }

  const fields: [keyof typeof v, string][] = [
    ["length", t.length],
    ["width", t.width],
    ["height", t.height],
    ["doors", t.doors],
    ["windows", t.windows],
    ["coats", t.coats],
  ];

  return (
    <section className="space-y-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
      <h2 className="text-lg font-extrabold text-brand-900">{t.calculatorTitle}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fields.map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-sm font-semibold text-brand-900">{label}</span>
            <input inputMode="decimal" value={v[key]} onChange={set(key)} className={input} />
          </label>
        ))}
      </div>
      <button type="button" onClick={calculate} className="rounded-full bg-brand-700 px-6 py-2.5 font-bold text-white hover:bg-brand-900">
        {t.calculate}
      </button>
      {result !== undefined && (
        <p role="status" className="font-semibold text-brand-700">
          {result === null ? t.invalidInput : t.estimate.replace("{n}", String(result))}
        </p>
      )}
    </section>
  );
}
