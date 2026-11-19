"use client";

import Image from "next/image";
import { useState } from "react";
import { checkImageFile, uploadImage } from "@/lib/images";

type Props = {
  folder: "products" | "categories" | "banners";
  value: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
};

// Holds only URLs. The parent form saves them. Photos are resized in the browser before upload.
export function ImageUploader({ folder, value, onChange, multiple = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const picked = Array.from(files);
    for (const f of picked) {
      const problem = checkImageFile(f);
      if (problem) return setError(problem);
    }
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of picked) urls.push(await uploadImage(f, folder));
      onChange(multiple ? [...value, ...urls] : urls.slice(0, 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "");
    } finally {
      setBusy(false);
    }
  }

  function move(i: number, by: -1 | 1) {
    const next = [...value];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <li key={url} className="w-28 space-y-1">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-brand-100 bg-brand-50">
              <Image src={url} alt="" fill sizes="112px" className="object-cover" />
            </div>
            <div className="flex justify-between gap-1">
              {multiple && (
                <>
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="→" className="rounded-lg border border-brand-100 px-2 text-sm disabled:opacity-30">
                    →
                  </button>
                  <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="←" className="rounded-lg border border-brand-100 px-2 text-sm disabled:opacity-30">
                    ←
                  </button>
                </>
              )}
              <button type="button" onClick={() => onChange(value.filter((u) => u !== url))} aria-label="×" className="rounded-lg border border-coral-500 px-2 text-sm text-coral-500">
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={busy}
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = "";
        }}
        className="block w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:font-bold file:text-white"
      />
      {error && (
        <p role="alert" className="text-sm font-semibold text-coral-500">
          {error}
        </p>
      )}
    </div>
  );
}
