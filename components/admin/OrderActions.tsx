"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { nextStatuses } from "@/lib/admin/orders";

const t = ar.admin.orders;
const labels = t.statuses as Record<string, string>;

type Props = {
  status: string;
  setStatus: (status: string) => Promise<ActionState>;
  deleteOrder: () => Promise<ActionState>;
};

// The buttons that move an order forward. Cancelling and returning ask first and say what happens to stock.
export function OrderActions({ status, setStatus, deleteOrder }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = nextStatuses(status);

  function change(to: string) {
    if (to === "cancelled" && !confirm(t.confirmCancel)) return;
    if (to === "returned" && !confirm(t.confirmReturn)) return;
    start(async () => {
      const r = await setStatus(to);
      setError(r.error ?? null);
      if (!r.error) router.refresh();
    });
  }

  function remove() {
    if (!confirm(t.confirmDelete)) return;
    start(async () => {
      const r = await deleteOrder();
      if (r.error) setError(r.error);
    });
  }

  return (
    <div className="space-y-3">
      {next.length === 0 ? (
        <p className="text-sm text-ink/70">{t.noNextStatus}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {next.map((to) => {
            const bad = to === "cancelled" || to === "returned";
            return (
              <button
                key={to}
                type="button"
                disabled={pending}
                onClick={() => change(to)}
                title={to === "cancelled" ? t.stockBack : undefined}
                className={`min-h-11 rounded-full px-5 font-bold disabled:opacity-60 ${
                  bad ? "border-2 border-coral-500 text-coral-500 hover:bg-coral-500/10" : "bg-brand-700 text-white hover:bg-brand-900"
                }`}
              >
                {labels[to]}
              </button>
            );
          })}
        </div>
      )}
      {status === "cancelled" && (
        <button type="button" disabled={pending} onClick={remove} className="min-h-11 rounded-full border-2 border-ink/30 px-5 text-sm font-bold text-ink/70 hover:bg-ink/5 disabled:opacity-60">
          {t.deleteOrder}
        </button>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-coral-500/10 px-3 py-2 font-semibold text-coral-500">
          {error}
        </p>
      )}
    </div>
  );
}
