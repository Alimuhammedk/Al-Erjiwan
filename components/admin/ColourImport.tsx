"use client";

import Link from "next/link";
import { ar } from "@/content/ar";
import type { ImportState } from "@/app/admin/(protected)/colours/actions";
import { useFormAction } from "./useFormAction";

const t = ar.admin.colours;
type Action = (prev: ImportState, formData: FormData) => Promise<ImportState>;

// Choose a CSV file, check it first, then import it. The button that was pressed decides which of the two runs.
export function ColourImport({ preview, run }: { preview: Action; run: Action }) {
  const { state, onSubmit, pending } = useFormAction<ImportState>(
    (prev, formData) => (formData.get("mode") === "import" ? run(prev, formData) : preview(prev, formData)),
    {},
  );
  const button = "min-h-11 rounded-full px-6 font-bold disabled:opacity-60";

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5 rounded-2xl bg-paper p-6">
      <p className="text-ink/80">{t.importHelp}</p>
      <label className="block">
        <span className="mb-1 block font-semibold text-brand-900">{t.chooseFile}</span>
        <input name="file" type="file" accept=".csv,text/csv" className="block w-full rounded-xl border border-brand-100 bg-paper p-3" />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button name="mode" value="preview" disabled={pending} className={`${button} border-2 border-brand-700 text-brand-700 hover:bg-brand-50`}>
          {t.preview}
        </button>
        <button name="mode" value="import" disabled={pending} className={`${button} bg-brand-700 text-white hover:bg-brand-900`}>
          {t.doImport}
        </button>
        <Link href="/admin/colours" className="font-bold text-brand-700">
          {ar.admin.cancel}
        </Link>
      </div>

      {state.error && (
        <p role="alert" className="font-semibold text-coral-500">
          {state.error}
        </p>
      )}
      {state.info && (
        <p role="status" className="font-bold text-brand-700">
          {state.info}
        </p>
      )}
      {state.issues && state.issues.length > 0 && (
        <ul className="list-disc space-y-1 ps-5 text-sm text-coral-500" data-testid="import-issues">
          {state.issues.map((line, n) => (
            <li key={n}>{line}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
