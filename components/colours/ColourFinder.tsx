"use client";

import { useEffect, useState } from "react";
import { ar } from "@/content/ar";
import { readableTextOn } from "@/lib/colours/hex";
import type { PickableColour } from "@/lib/colours/search";

const t = ar.product.finder;

type Props = {
  value: PickableColour | null;
  onChange: (colour: PickableColour | null) => void;
  endpoint?: string;
};

// The colour chooser for mixed paint: type a name or code, tap a shade. It asks the server as you type, so it
// stays fast however many shades the catalogue has. Nothing here is required: the page also accepts a typed colour.
export function ColourFinder({ value, onChange, endpoint = "/api/colours" }: Props) {
  const [q, setQ] = useState("");
  // the last answer, with the search it belongs to (a different search means the answer is still on its way)
  const [answer, setAnswer] = useState<{ q: string; list: PickableColour[]; failed: boolean } | null>(null);
  const state = !answer || answer.q !== q ? "loading" : answer.failed ? "failed" : "done";
  const list = answer?.list ?? [];

  useEffect(() => {
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error("bad answer");
        const data = (await res.json()) as { colours?: PickableColour[] };
        setAnswer({ q, list: Array.isArray(data.colours) ? data.colours : [], failed: false });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setAnswer({ q, list: [], failed: true });
      }
    }, q ? 250 : 0);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [q, endpoint]);

  return (
    <div className="space-y-3" data-testid="colour-finder">
      {value && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-brand-700 bg-brand-50 p-2" data-testid="chosen-colour">
          <span style={{ backgroundColor: value.hex }} className="size-10 shrink-0 rounded-full border border-ink/15" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block break-words font-bold text-brand-900">{value.name_ar}</span>
            {value.code && (
              <span dir="ltr" className="block text-start text-xs text-ink/70">
                {[value.system, value.code].filter(Boolean).join(" ")}
              </span>
            )}
          </span>
          <button type="button" onClick={() => onChange(null)} className="min-h-11 rounded-full px-3 text-sm font-bold text-brand-700 hover:bg-brand-100">
            {t.clear}
          </button>
        </div>
      )}

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value.slice(0, 40))}
        placeholder={t.search}
        aria-label={t.search}
        className="h-11 w-full rounded-xl border border-brand-100 bg-paper px-4 focus:border-brand-500 focus:outline-none"
      />

      {state === "failed" ? (
        <p role="status" className="text-sm text-ink/70">
          {t.failed}
        </p>
      ) : state === "done" && list.length === 0 ? (
        <p role="status" className="text-sm text-ink/70">
          {t.none}
        </p>
      ) : (
        <ul className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto pe-1 sm:grid-cols-6" aria-busy={state === "loading"}>
          {list.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onChange(c)}
                aria-label={c.name_ar}
                aria-pressed={value?.id === c.id}
                title={[c.name_ar, c.code].filter(Boolean).join(" · ")}
                style={{ backgroundColor: c.hex, color: readableTextOn(c.hex) }}
                className={`grid aspect-square w-full min-h-11 place-items-center rounded-xl border-2 text-[10px] font-bold ${value?.id === c.id ? "border-brand-900 ring-2 ring-brand-500" : "border-brand-100"}`}
              >
                <span aria-hidden="true" dir="ltr">
                  {c.code ?? ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <a href="/colours" className="inline-block text-sm font-bold text-brand-700 underline" target="_blank" rel="noopener">
        {t.openPicker}
      </a>
    </div>
  );
}
