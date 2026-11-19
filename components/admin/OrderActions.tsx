"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { STATUS_ORDER } from "@/lib/admin/orders";

const t = ar.admin.orders;
const labels = t.statuses as Record<string, string>;
const handled = ["cancelled", "returned"];

type Props = {
  status: string;
  setStatus: (status: string) => Promise<ActionState>;
};

// All six statuses are always shown and any can be chosen, so a mistake is one tap to undo. Cancelling, returning
// and reopening ask first, because they move stock.
export function OrderActions({ status, setStatus }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(to: string) {
    if (to === status) return;
    if (to === "cancelled" && !confirm(t.confirmCancel)) return;
    if (to === "returned" && !confirm(t.confirmReturn)) return;
    if (handled.includes(status) && !handled.includes(to) && !confirm(t.confirmReopen)) return;
    start(async () => {
      const r = await setStatus(to);
      setError(r.error ?? null);
      if (!r.error) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t.changeStatus}>
        {STATUS_ORDER.map((s) => {
          const current = s === status;
          const bad = handled.includes(s);
          return (
            <button
              key={s}
              type="button"
              disabled={pending}
              aria-pressed={current}
              onClick={() => change(s)}
              className={`min-h-11 rounded-full px-5 font-bold disabled:opacity-60 ${
                current
                  ? bad
                    ? "bg-coral-500 text-white"
                    : "bg-brand-700 text-white"
                  : bad
                    ? "border-2 border-coral-500 text-coral-500 hover:bg-coral-500/10"
                    : "border-2 border-brand-700 text-brand-700 hover:bg-brand-50"
              }`}
            >
              {labels[s]}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-coral-500/10 px-3 py-2 font-semibold text-coral-500">
          {error}
        </p>
      )}
    </div>
  );
}
