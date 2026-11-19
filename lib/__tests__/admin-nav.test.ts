import { describe, expect, it } from "vitest";
import { ADMIN_TABS, activeTab } from "../admin/nav";

describe("ADMIN_TABS", () => {
  it("are in the order the owner asked for", () => {
    expect(ADMIN_TABS.map((t) => t.label)).toEqual(["الرئيسية", "الطلبات", "الفئات والبانرات", "المنتجات", "المخزون", "الألوان", "التوصيل"]);
  });
  it("has no separate categories or banners tab", () => {
    expect(ADMIN_TABS.some((t) => /categories|banners/.test(t.href))).toBe(false);
  });
});

describe("activeTab", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/orders", "/admin/orders"],
    ["/admin/orders/123/print", "/admin/orders"],
    ["/admin/storefront", "/admin/storefront"],
    ["/admin/categories/new", "/admin/storefront"],
    ["/admin/categories/abc", "/admin/storefront"],
    ["/admin/banners/new", "/admin/storefront"],
    ["/admin/products/new", "/admin/products"],
    ["/admin/stock", "/admin/stock"],
    ["/admin/colours/import", "/admin/colours"],
    ["/admin/delivery", "/admin/delivery"],
    ["/admin/delivery-companies/new", "/admin/delivery"],
  ])("%s lights %s", (path, tab) => expect(activeTab(path)).toBe(tab));

  it("lights nothing on the login page or an unknown page, and the home tab is not lit on every page", () => {
    expect(activeTab("/admin/login")).toBeNull();
    expect(activeTab("/admin/whatever")).toBeNull();
    expect(activeTab("/admin/orders")).not.toBe("/admin");
  });
});
