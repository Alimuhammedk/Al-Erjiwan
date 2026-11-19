"use client";

import { ar } from "@/content/ar";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="min-h-11 rounded-full bg-brand-700 px-6 font-bold text-white hover:bg-brand-900 print:hidden">
      {ar.admin.orders.print}
    </button>
  );
}
