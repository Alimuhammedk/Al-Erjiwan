"use client";

import { useRef, useState, useTransition } from "react";
import { ar } from "@/content/ar";
import { PLACEHOLDERS, customerWhatsAppUrl, fillTemplate, type AdminOrder, type MessageKind } from "@/lib/admin/orders";
import type { ActionState } from "@/lib/admin/types";
import { inputClass } from "./FormField";

const t = ar.admin.orders;
const names = ar.admin.orders.msg.placeholders as Record<string, string>;

type Props = {
  order: AdminOrder;
  kind: MessageKind;
  label: string;
  initialTemplate: string;
  defaultTemplate: string;
  saveTemplate: (kind: MessageKind, template: string) => Promise<ActionState>;
  primary?: boolean;
};

// A customer message the owner can reword for this order, send on WhatsApp, and keep as the preset for future orders.
export function MessageComposer({ order, kind, label, initialTemplate, defaultTemplate, saveTemplate, primary }: Props) {
  const [template, setTemplate] = useState(initialTemplate);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<"saved" | string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  function insert(key: string) {
    const el = box.current;
    const word = `{${key}}`;
    const from = el?.selectionStart ?? template.length;
    const to = el?.selectionEnd ?? template.length;
    setTemplate(template.slice(0, from) + word + template.slice(to));
    setResult(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(from + word.length, from + word.length);
    });
  }

  function save() {
    start(async () => {
      const r = await saveTemplate(kind, template);
      setResult(r.error ?? "saved");
    });
  }

  return (
    <details className="rounded-xl border-2 border-[#25D366] open:bg-[#25D366]/5" data-testid={`composer-${kind}`}>
      <summary className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-5 font-bold ${primary ? "bg-[#25D366] text-white" : "text-ink"}`}>{label}</summary>
      <div className="space-y-3 p-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-900">{t.messageText}</span>
          <textarea
            ref={box}
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              setResult(null);
            }}
            rows={7}
            maxLength={1500}
            className={inputClass}
          />
        </label>
        <p className="text-xs text-ink/70">{t.messageHelp}</p>
        <div className="flex flex-wrap items-center gap-2" aria-label={t.insert}>
          <span className="text-sm font-semibold text-ink/70">{t.insert}:</span>
          {PLACEHOLDERS.map((k) => (
            <button key={k} type="button" onClick={() => insert(k)} className="min-h-11 rounded-full border border-brand-100 bg-paper px-3 text-sm font-bold text-brand-700 hover:bg-brand-50">
              {names[k]}
            </button>
          ))}
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold text-brand-900">{t.preview}</p>
          <pre data-testid={`preview-${kind}`} className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-paper p-3 font-[inherit] text-sm">
            {fillTemplate(template, order)}
          </pre>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={customerWhatsAppUrl(order, kind, template)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#25D366] px-5 font-bold text-white hover:opacity-90"
          >
            {t.sendWhatsApp}
          </a>
          <button type="button" disabled={pending} onClick={save} className="min-h-11 rounded-full border-2 border-brand-700 px-5 font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-60">
            {t.saveTemplate}
          </button>
          <button
            type="button"
            onClick={() => {
              setTemplate(defaultTemplate);
              setResult(null);
            }}
            className="min-h-11 rounded-full px-5 text-sm font-bold text-ink/70 hover:bg-ink/5"
          >
            {t.resetTemplate}
          </button>
        </div>
        {result === "saved" && (
          <p role="status" className="font-semibold text-brand-700">
            {t.templateSaved}
          </p>
        )}
        {result && result !== "saved" && (
          <p role="alert" className="font-semibold text-coral-500">
            {result}
          </p>
        )}
      </div>
    </details>
  );
}
