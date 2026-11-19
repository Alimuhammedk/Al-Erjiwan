"use client";

import { useEffect, useRef, useState } from "react";
import { ar } from "@/content/ar";
import { readableTextOn } from "@/lib/colours/hex";
import type { PickableColour } from "@/lib/colours/search";

const t = ar.product.panel;

type Props = {
  productId: string;
  value: PickableColour | null;
  onChange: (colour: PickableColour | null) => void;
  endpoint?: string;
};

type Answer = { key: string; colours: PickableColour[]; families: string[]; failed: boolean };

// The colour choice for a mixed paint, kept out of the way: one slim row (a swatch and the chosen name). Tapping it
// opens a panel with search, family tabs and only the colours this product offers; picking one closes the panel.
export function ColourPanel({ productId, value, onChange, endpoint = "/api/colours" }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [knownFamilies, setKnownFamilies] = useState<string[]>([]);
  const opener = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const key = `${q}|${family ?? ""}`;
  const loading = open && (!answer || answer.key !== key);

  // Ask the server whenever the panel is open and the search changes (after a short pause while typing).
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ product: productId, q });
        if (family) params.set("family", family);
        const res = await fetch(`${endpoint}?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("bad answer");
        const data = (await res.json()) as { colours?: PickableColour[]; families?: string[] };
        const families = Array.isArray(data.families) ? data.families : [];
        setAnswer({ key, colours: Array.isArray(data.colours) ? data.colours : [], families, failed: false });
        if (!family && !q) setKnownFamilies(families);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setAnswer({ key, colours: [], families: [], failed: true });
      }
    }, q ? 250 : 0);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [open, q, family, key, productId, endpoint]);

  // While open: Escape closes, the page behind does not scroll, and the search box gets the focus.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    search.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  function close() {
    setOpen(false);
    opener.current?.focus();
  }
  function pick(c: PickableColour) {
    onChange(c);
    close();
  }

  const families = knownFamilies.length ? knownFamilies : (answer?.families ?? []);
  const tab = "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold";

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          ref={opener}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          data-testid="colour-row"
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl border-2 border-brand-100 bg-paper px-4 text-start hover:border-brand-500"
        >
          <span
            style={value ? { backgroundColor: value.hex } : undefined}
            className={`size-8 shrink-0 rounded-full border border-ink/15 ${value ? "" : "bg-[conic-gradient(#e8573f,#f6b73c,#7fc36b,#4aa3df,#8a4fb8,#e8573f)]"}`}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="block break-words font-bold text-brand-900">{value ? value.name_ar : t.choose}</span>
            {value?.code && (
              <span dir="ltr" className="block text-start text-xs text-ink/60">
                {[value.system, value.code].filter(Boolean).join(" ")}
              </span>
            )}
          </span>
          <span aria-hidden="true" className="text-brand-700">
            ▾
          </span>
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="min-h-11 shrink-0 rounded-full px-3 text-sm font-bold text-brand-700 hover:bg-brand-50">
            {t.clear}
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" data-testid="colour-dialog">
          <button type="button" aria-label={t.close} tabIndex={-1} onClick={close} className="absolute inset-0 cursor-default bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={t.title} className="relative flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-paper shadow-xl md:max-w-lg md:rounded-3xl">
            <div className="flex items-center justify-between gap-3 border-b border-brand-100 p-4">
              <h2 className="text-lg font-extrabold text-brand-900">{t.title}</h2>
              <button type="button" onClick={close} className="grid size-11 place-items-center rounded-full text-xl text-brand-700 hover:bg-brand-50" aria-label={t.close}>
                ×
              </button>
            </div>

            <div className="space-y-3 p-4 pb-2">
              <input
                ref={search}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value.slice(0, 40))}
                placeholder={t.search}
                aria-label={t.search}
                className="h-11 w-full rounded-xl border border-brand-100 bg-paper px-4 focus:border-brand-500 focus:outline-none"
              />
              {families.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t.families}>
                  <button type="button" aria-pressed={family === null} onClick={() => setFamily(null)} className={`${tab} ${family === null ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700"}`}>
                    {t.all}
                  </button>
                  {families.map((f) => (
                    <button key={f} type="button" aria-pressed={family === f} onClick={() => setFamily(f)} className={`${tab} ${family === f ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-40 flex-1 overflow-y-auto p-4 pt-2" aria-busy={loading}>
              {answer?.failed && answer.key === key ? (
                <p role="status" className="py-6 text-center text-ink/70">
                  {t.failed}
                </p>
              ) : !loading && answer && answer.colours.length === 0 ? (
                <p role="status" className="py-6 text-center text-ink/70">
                  {t.none}
                </p>
              ) : (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {(answer?.colours ?? []).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => pick(c)}
                        aria-label={c.name_ar}
                        aria-pressed={value?.id === c.id}
                        className="group block w-full text-center"
                      >
                        <span
                          style={{ backgroundColor: c.hex, color: readableTextOn(c.hex) }}
                          className={`grid aspect-square w-full place-items-center rounded-2xl border-2 text-lg ${value?.id === c.id ? "border-brand-900 ring-2 ring-brand-500" : "border-ink/10 group-hover:border-brand-500"}`}
                        >
                          {value?.id === c.id ? "✓" : ""}
                        </span>
                        <span className="mt-1 block break-words text-xs font-semibold text-brand-900">{c.name_ar}</span>
                        {c.code && (
                          <span dir="ltr" className="block text-[11px] text-ink/60">
                            {c.code}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
