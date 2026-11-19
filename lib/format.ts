import { localeOf, type Lang } from "@/lib/i18n/lang";

const dinar = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// Whole Iraqi dinar with comma separators, e.g. 25000 -> "25,000 د.ع" (or "25,000 IQD" when the English word is passed).
export function formatPrice(amount: number, unit = "د.ع"): string {
  return `${dinar.format(Math.round(amount))} ${unit}`;
}

// Date and time as Ali and customers read them: Baghdad time, Arabic words, ordinary digits.
export function formatDateTime(iso: string, lang: Lang = "ar"): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(localeOf(lang), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Baghdad" });
}

// Just the date (no time), for articles: Baghdad time, Arabic words, ordinary digits.
export function formatDate(iso: string, lang: Lang = "ar"): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(localeOf(lang), { dateStyle: "long", timeZone: "Asia/Baghdad" });
}
