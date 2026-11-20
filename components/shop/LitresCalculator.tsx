"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
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
  const m = useMessages();
  const t = m.product;
  const reduceMotion = useReducedMotion();
  const resultRef = useRef<HTMLDivElement>(null);
  const [v, setV] = useState({ length: "", width: "", height: "", doors: "1", windows: "1", coats: "2" });
  // undefined: not calculated yet, null: bad input, number: litres
  const [result, setResult] = useState<number | null | undefined>(undefined);
  const [runs, setRuns] = useState(0);

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
    setRuns((n) => n + 1);
  }

  // Bring the answer into view, so a customer on a phone can't miss it below the button.
  useEffect(() => {
    if (runs > 0) resultRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }, [runs, reduceMotion]);

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

      <div ref={resultRef} className="scroll-mt-24">
        {typeof result === "number" && (
          <motion.div
            key={runs}
            role="status"
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-2xl bg-gradient-to-br from-brand-900 via-brand-700 to-magenta-500 p-6 text-center text-white shadow-lg ring-4 ring-sun-300/60"
          >
            <p className="text-base font-semibold text-white/90">{t.resultLabel}</p>
            <p className="my-1 flex items-baseline justify-center gap-3">
              <span data-testid="litres-result" className="text-6xl font-extrabold leading-none text-sun-300 sm:text-7xl">
                {result}
              </span>{" "}
              <span className="text-2xl font-bold">{t.resultUnit}</span>
            </p>
            <p className="mt-3 text-sm text-white/80">{t.resultNote}</p>
          </motion.div>
        )}
        {result === null && (
          <p role="alert" className="rounded-xl border-2 border-coral-500 bg-coral-500/10 px-4 py-3 text-base font-bold text-coral-500">
            {t.invalidInput}
          </p>
        )}
      </div>
    </section>
  );
}
