import { ar } from "@/content/ar";

const n = ar.admin.nav;

// The admin tabs in order. `match`: the address starts that keep a tab lit; the first tab is lit only on its exact address.
export const ADMIN_TABS = [
  { href: "/admin", label: n.dashboard, icon: "stats", match: [] as string[] },
  { href: "/admin/orders", label: n.orders, icon: "orders", match: ["/admin/orders"] },
  { href: "/admin/banners", label: n.banners, icon: "banners", match: ["/admin/banners"] },
  { href: "/admin/categories", label: n.categories, icon: "categories", match: ["/admin/categories"] },
  { href: "/admin/articles", label: n.articles, icon: "articles", match: ["/admin/articles"] },
  { href: "/admin/products", label: n.products, icon: "products", match: ["/admin/products"] },
  { href: "/admin/stock", label: n.stock, icon: "stock", match: ["/admin/stock"] },
  { href: "/admin/colours", label: n.colours, icon: "colours", match: ["/admin/colours"] },
  { href: "/admin/delivery", label: n.delivery, icon: "delivery", match: ["/admin/delivery"] },
] as const;

// The tab that should look selected for an address (or null, for example on the login page).
export function activeTab(path: string): string | null {
  if (path === "/admin") return "/admin";
  return ADMIN_TABS.find((t) => t.match.some((m) => path === m || path.startsWith(m + "/") || path.startsWith(m + "-")))?.href ?? null;
}
