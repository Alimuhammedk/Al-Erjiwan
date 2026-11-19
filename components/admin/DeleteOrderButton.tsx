"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";

const t = ar.admin.orders;

type Props = {
  code: string;
  status: string;
  deleteOrder: () => Promise<ActionState>;
  // where to go once it is gone: the list (from the order page) or just refresh the list
  after: "list" | "refresh";
  className?: string;
};

// Deletes any order after a confirmation that says what happens to stock.
export function DeleteOrderButton({ code, status, deleteOrder, after, className = "" }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const stockText =
    status === "delivered" ? t.deleteStockDelivered : status === "cancelled" || status === "returned" ? t.deleteStockKept : t.deleteStockBack;

  function remove() {
    if (!confirm(`${t.confirmDelete.replace("{code}", code)} ${stockText}`)) return;
    start(async () => {
      const r = await deleteOrder();
      setError(r.error ?? null);
      if (r.error) return;
      if (after === "list") router.push("/admin/orders");
      else router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        className={`min-h-11 rounded-full border-2 border-coral-500 px-5 text-sm font-bold text-coral-500 hover:bg-coral-500/10 disabled:opacity-60 ${className}`}
      >
        {t.deleteOrder}
      </button>
      {error && (
        <span role="alert" className="text-sm font-semibold text-coral-500">
          {error}
        </span>
      )}
    </span>
  );
}
