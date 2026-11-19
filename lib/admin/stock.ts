import { ar } from "@/content/ar";

const t = ar.admin.stock;

export const STOCK_MODES = ["add", "shop_sale", "set"] as const;
export type StockMode = (typeof STOCK_MODES)[number];

export type StockLevel = "out" | "low" | "ok";
export const stockLevel = (stock: number, threshold: number): StockLevel => (stock <= 0 ? "out" : stock <= threshold ? "low" : "ok");

// A whole number from 0 to 100000, typed with Arabic or Western digits.
export function parseAmount(input: string): number | null {
  const digits = input
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[,٬\s]/g, "");
  if (!/^\d{1,6}$/.test(digits)) return null;
  const n = Number(digits);
  return n <= 100000 ? n : null;
}

export type StockPlan = { ok: true; delta: number; reason: "manual" | "shop_sale"; note: string | null } | { ok: false; error: string };

// What a stock button means for the database: a signed change and why. "set" replaces the number, so it needs the current one.
export function planStockChange(mode: string, amountText: string, current: number): StockPlan {
  const amount = parseAmount(amountText);
  if (amount === null) return { ok: false, error: t.invalidAmount };
  if (mode === "add" || mode === "shop_sale") {
    if (amount < 1) return { ok: false, error: t.invalidAmount };
    return mode === "add" ? { ok: true, delta: amount, reason: "manual", note: t.noteArrived } : { ok: true, delta: -amount, reason: "shop_sale", note: null };
  }
  if (mode === "set") {
    const delta = amount - current;
    return delta === 0 ? { ok: false, error: t.noChange } : { ok: true, delta, reason: "manual", note: t.noteSet };
  }
  return { ok: false, error: t.invalidAmount };
}
