"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ar } from "@/content/ar";
import type { Colour } from "@/types/db";

export type PickableColour = Pick<Colour, "id" | "name_ar" | "name_en" | "code" | "hex" | "family">;

const SHOWN = 60;

function Swatch({ hex }: { hex?: string }) {
  return (
    <span
      aria-hidden="true"
      style={hex ? { backgroundColor: hex } : undefined}
      className={`size-6 shrink-0 rounded-full border border-ink/15 ${hex ? "" : "bg-[repeating-conic-gradient(#e5e0ea_0_25%,#fff_0_50%)] bg-[length:10px_10px]"}`}
    />
  );
}

// A searchable colour chooser: type a name or a code and pick. Only the first 60 matches are drawn, so it stays
// fast with thousands of colours.
// shortcut: the whole colour list is loaded into the page; move to a server-side search when the catalogue is big.
export function ColourPicker({
  value,
  onChange,
  colours,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  colours: PickableColour[];
  label: string;
}) {
  const t = ar.admin.form;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();
  const current = colours.find((c) => c.id === value);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? colours.filter((c) => [c.name_ar, c.name_en, c.code].some((x) => x?.toLowerCase().includes(s))) : colours;
    return list.slice(0, SHOWN);
  }, [colours, q]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onDown = (e: MouseEvent | TouchEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQ("");
  }

  const option = "flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-start hover:bg-brand-50 aria-selected:bg-brand-100";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-brand-100 bg-paper px-3 text-start focus:border-brand-500 focus:outline-none"
      >
        <Swatch hex={current?.hex} />
        <span className="min-w-0 flex-1 truncate">
          {current ? current.name_ar : t.noColour}
          {current?.code && <span className="ms-2 text-xs text-ink/70">{current.code}</span>}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute start-0 top-full z-30 mt-1 w-full min-w-64 rounded-xl border border-brand-100 bg-paper p-2 shadow-xl">
          <input
            ref={search}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchColour}
            aria-label={t.searchColour}
            className="h-11 w-full rounded-lg border border-brand-100 px-3 focus:border-brand-500 focus:outline-none"
          />
          <ul id={listId} role="listbox" aria-label={label} className="mt-2 max-h-64 overflow-y-auto">
            <li role="presentation">
              <button type="button" role="option" aria-selected={value === ""} onClick={() => pick("")} className={option}>
                <Swatch />
                <span>{t.noColour}</span>
              </button>
            </li>
            {matches.map((c) => (
              <li key={c.id} role="presentation">
                <button type="button" role="option" aria-selected={c.id === value} onClick={() => pick(c.id)} className={option}>
                  <Swatch hex={c.hex} />
                  <span className="min-w-0 flex-1 truncate">{c.name_ar}</span>
                  {c.code && <span dir="ltr" className="text-xs text-ink/70">{c.code}</span>}
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-2 py-3 text-sm text-ink/70">{t.noColourMatch}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
