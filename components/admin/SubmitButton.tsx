"use client";

import { ar } from "@/content/ar";

export function SubmitButton({ label = ar.admin.save, pending = false }: { label?: string; pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-full bg-brand-700 px-8 py-2.5 font-bold text-white hover:bg-brand-900 disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}
