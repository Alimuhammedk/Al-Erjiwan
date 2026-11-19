const dinar = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// Whole Iraqi dinar with comma separators, e.g. 25000 -> "25,000 د.ع"
export function formatPrice(amount: number): string {
  return `${dinar.format(Math.round(amount))} د.ع`;
}
