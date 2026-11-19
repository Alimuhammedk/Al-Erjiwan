"use client";

import Link from "next/link";
import { useState } from "react";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { ARTICLE_MAX, type Article } from "@/lib/articles";
import { FormField, inputClass } from "./FormField";
import { ImageUploader } from "./ImageUploader";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";

const t = ar.admin.articles;

type Props = { action: (prev: ActionState, formData: FormData) => Promise<ActionState>; initial?: Article };

// One article: title, short summary, text, a cover picture and up to six more pictures. One save for everything.
export function ArticleForm({ action, initial }: Props) {
  const { state, onSubmit, pending } = useFormAction(action, {} as ActionState);
  const [cover, setCover] = useState<string[]>(initial?.cover_url ? [initial.cover_url] : []);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const err = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5 rounded-2xl bg-paper p-5 sm:p-6">
      <input type="hidden" name="cover_url" value={cover[0] ?? ""} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <FormField label={t.titleField} error={err.title}>
        <input name="title" defaultValue={initial?.title} maxLength={ARTICLE_MAX.title} className={inputClass} />
      </FormField>

      <div>
        <span className="mb-1 block font-semibold text-brand-900">{t.cover}</span>
        <ImageUploader folder="articles" value={cover} onChange={setCover} />
        {err.cover_url && (
          <p role="alert" className="mt-1 text-sm font-semibold text-coral-500">
            {err.cover_url}
          </p>
        )}
      </div>

      <FormField label={t.excerpt} error={err.excerpt}>
        <textarea name="excerpt" rows={2} defaultValue={initial?.excerpt ?? ""} maxLength={ARTICLE_MAX.excerpt} className={inputClass} />
        <span className="mt-1 block text-sm text-ink/60">{t.excerptHint}</span>
      </FormField>

      <FormField label={t.body} error={err.body}>
        <textarea name="body" rows={12} defaultValue={initial?.body} maxLength={ARTICLE_MAX.body} className={`${inputClass} leading-8`} />
        <span className="mt-1 block text-sm text-ink/60">{t.bodyHint}</span>
      </FormField>

      <div>
        <span className="mb-1 block font-semibold text-brand-900">{t.extra}</span>
        <ImageUploader folder="articles" value={images} onChange={(v) => setImages(v.slice(0, ARTICLE_MAX.images))} multiple />
        {err.images && (
          <p role="alert" className="mt-1 text-sm font-semibold text-coral-500">
            {err.images}
          </p>
        )}
      </div>

      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="is_published" defaultChecked={initial?.is_published ?? true} className="size-5 accent-[#602f8a]" />
        <span className="font-semibold text-brand-900">{t.published}</span>
      </label>

      {state.error && (
        <p role="alert" className="font-semibold text-coral-500">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} />
        <Link href="/admin/articles" className="font-bold text-brand-700">
          {ar.admin.cancel}
        </Link>
      </div>
    </form>
  );
}
