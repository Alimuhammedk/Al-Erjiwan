const dinar = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// Whole Iraqi dinar with comma separators, e.g. 25000 -> "25,000 د.ع"
export function formatPrice(amount: number): string {
  return `${dinar.format(Math.round(amount))} د.ع`;
}

// Date and time as Ali and customers read them: Baghdad time, Arabic words, ordinary digits.
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar-IQ-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Baghdad" });
}

// Just the date (no time), for articles: Baghdad time, Arabic words, ordinary digits.
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ar-IQ-u-nu-latn", { dateStyle: "long", timeZone: "Asia/Baghdad" });
}
