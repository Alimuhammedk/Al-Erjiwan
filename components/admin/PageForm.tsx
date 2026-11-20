"use client";

import Link from "next/link";
import { useState } from "react";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { parseMapLocation } from "@/lib/maps";
import { PAGE_MAX, type SitePage } from "@/lib/pages";
import { FormField, inputClass } from "./FormField";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";

const t = ar.admin.pages;

type Props = { page: SitePage; action: (prev: ActionState, formData: FormData) => Promise<ActionState> };

// One page, in Arabic and English. The About page also has the store's map link, checked as you type.
export function PageForm({ page, action }: Props) {
  const { state, onSubmit, pending } = useFormAction(action, {} as ActionState);
  const [map, setMap] = useState(page.map_url ?? "");
  const err = state.errors ?? {};
  const location = map.trim() ? parseMapLocation(map) : null;

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5 rounded-2xl bg-paper p-5 sm:p-6">
      <FormField label={t.titleAr} error={err.title_ar}>
        <input name="title_ar" defaultValue={page.title_ar} maxLength={PAGE_MAX.title} className={inputClass} />
      </FormField>
      <FormField label={t.bodyAr} error={err.body_ar}>
        <textarea name="body_ar" rows={10} defaultValue={page.body_ar} maxLength={PAGE_MAX.body} className={`${inputClass} leading-8`} />
        <span className="mt-1 block text-sm text-ink/60">{t.bodyHint}</span>
        {page.slug === "faq" && <span className="mt-1 block text-sm font-bold text-brand-700">{t.faqHint}</span>}
      </FormField>

      <section className="space-y-4 rounded-xl border border-brand-100 bg-brand-50/50 p-4" dir="ltr" lang="en">
        <FormField label={t.titleEn} error={err.title_en}>
          <input name="title_en" dir="ltr" defaultValue={page.title_en} maxLength={PAGE_MAX.title} className={`${inputClass} text-start`} />
        </FormField>
        <FormField label={t.bodyEn} error={err.body_en}>
          <textarea name="body_en" dir="ltr" rows={10} defaultValue={page.body_en} maxLength={PAGE_MAX.body} className={`${inputClass} text-start leading-8`} />
        </FormField>
      </section>

      {page.slug === "about" && (
        <div className="space-y-2">
          <FormField label={t.map} error={err.map_url}>
            <input name="map_url" dir="ltr" value={map} onChange={(e) => setMap(e.target.value)} maxLength={PAGE_MAX.map} className={`${inputClass} text-start`} />
          </FormField>
          <p className="text-sm text-ink/70">{t.mapHelp}</p>
          {map.trim() &&
            (location ? (
              <p role="status" className="text-sm font-bold text-brand-700" data-testid="map-status">
                {location.embedUrl ? t.mapOk : t.mapShort}
              </p>
            ) : (
              <p role="status" className="text-sm font-bold text-coral-500" data-testid="map-status">
                {t.badMap}
              </p>
            ))}
        </div>
      )}

      {state.error && (
        <p role="alert" className="font-semibold text-coral-500">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} />
        <Link href="/admin/pages" className="font-bold text-brand-700">
          {ar.admin.cancel}
        </Link>
      </div>
    </form>
  );
}
