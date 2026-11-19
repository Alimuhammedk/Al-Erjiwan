"use client";

import { useFormStatus } from "react-dom";
import { ar } from "@/content/ar";

export function SubmitButton({ label = ar.admin.save }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-brand-700 px-8 py-3 font-bold text-white hover:bg-brand-900 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
