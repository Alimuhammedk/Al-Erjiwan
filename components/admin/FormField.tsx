import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl border border-brand-100 bg-paper px-4 py-3 focus:border-brand-500 focus:outline-none";

export function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold text-brand-900">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-sm font-semibold text-coral-500">
          {error}
        </span>
      )}
    </label>
  );
}
