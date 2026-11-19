"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ar } from "@/content/ar";
import type { StockRow } from "@/lib/admin/stock-data";
import { stockLevel, type StockLevel } from "@/lib/admin/stock";
import type { ActionState } from "@/lib/admin/types";
import { inputClass } from "./FormField";
import { useFormAction } from "./useFormAction";

const t = ar.admin.stock;
const action = "min-h-11 rounded-full px-4 text-sm font-bold disabled:opacity-60";

export const levelClasses: Record<StockLevel, string> = {
  out: "bg-coral-500 text-white",
  low: "bg-orange-400 text-ink",
  ok: "bg-emerald-600 text-white",
};

export function LevelBadge({ stock, threshold }: { stock: number; threshold: number }) {
  const level = stockLevel(stock, threshold);
  return <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${levelClasses[level]}`}>{t.level[level]}</span>;
}

type Props = {
  rows: StockRow[];
  threshold: number;
  adjust: (prev: ActionState, formData: FormData) => Promise<ActionState>;
};

function Row({ row, threshold, adjust }: { row: StockRow; threshold: number; adjust: Props["adjust"] }) {
  const router = useRouter();
  const { state, onSubmit, pending } = useFormAction(adjust, {} as ActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const done = !state.errors && !state.error;
  const amountError = state.errors?.amount ?? state.error;

  // After a good change: clear the box and show the new number.
  const wasPending = useRef(false);
  useEffect(() => {
    if (pending) wasPending.current = true;
    else if (wasPending.current) {
      wasPending.current = false;
      if (done) {
        formRef.current?.reset();
        router.refresh();
      }
    }
  }, [pending, done, router]);

  return (
    <li className="space-y-2 p-4" data-testid="stock-row">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1 break-words font-bold text-brand-900">
          {row.name}
          {row.size && <span className="font-normal text-ink/70"> · {row.size}</span>}
          {!row.active && <span className="ms-2 rounded-full bg-ink/10 px-2 py-0.5 text-xs font-bold text-ink/70">{t.inactive}</span>}
        </span>
        <span data-testid="stock-quantity" className="text-xl font-extrabold text-brand-900">
          {row.stock}
        </span>
        <LevelBadge stock={row.stock} threshold={threshold} />
      </div>
      <form ref={formRef} onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="product_id" value={row.productId} />
        <input type="hidden" name="variant_id" value={row.variantId ?? ""} />
        <input name="amount" inputMode="numeric" dir="ltr" aria-label={`${t.amount}: ${row.name}${row.size ? ` ${row.size}` : ""}`} className={`${inputClass} w-24 py-2 text-start`} />
        <button name="mode" value="add" disabled={pending} className={`${action} bg-brand-700 text-white hover:bg-brand-900`}>
          {t.add}
        </button>
        <button name="mode" value="shop_sale" disabled={pending} className={`${action} border-2 border-brand-700 text-brand-700 hover:bg-brand-50`}>
          {t.shopSale}
        </button>
        <button name="mode" value="set" disabled={pending} className={`${action} border-2 border-ink/30 text-ink/80 hover:bg-ink/5`}>
          {t.set}
        </button>
        {amountError && (
          <span role="alert" className="text-sm font-semibold text-coral-500">
            {amountError}
          </span>
        )}
      </form>
    </li>
  );
}

// The stock list: one row per product (or per size) with quick buttons. Each row saves on its own.
export function StockTable({ rows, threshold, adjust }: Props) {
  if (rows.length === 0) return <p className="rounded-2xl bg-paper p-8 text-center text-brand-700">{t.empty}</p>;
  return (
    <ul className="divide-y divide-brand-100 rounded-2xl bg-paper">
      {rows.map((r) => (
        <Row key={r.key} row={r} threshold={threshold} adjust={adjust} />
      ))}
    </ul>
  );
}
