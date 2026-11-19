"use client";

import { useState, useTransition } from "react";
import { saveProductImagesAction } from "@/app/admin/(protected)/products/extras";
import { ar } from "@/content/ar";
import { ImageUploader } from "./ImageUploader";

export function ProductPhotos({ productId, initial }: { productId: string; initial: string[] }) {
  const [urls, setUrls] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await saveProductImagesAction(productId, urls);
      setMessage(r.error ?? ar.admin.saved);
    });
  }

  return (
    <section className="max-w-2xl space-y-4 rounded-2xl bg-paper p-6">
      <h2 className="text-lg font-extrabold text-brand-900">{ar.admin.products.photos}</h2>
      <ImageUploader folder="products" value={urls} onChange={setUrls} multiple />
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="rounded-full bg-brand-700 px-6 py-2 font-bold text-white disabled:opacity-60">
          {ar.admin.save}
        </button>
        {message && <span role="status" className="font-semibold text-brand-700">{message}</span>}
      </div>
    </section>
  );
}
