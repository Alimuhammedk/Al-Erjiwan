import { describe, expect, it } from "vitest";
import { ADMIN_TABS, activeTab } from "../admin/nav";

describe("ADMIN_TABS", () => {
  it("are in the order the owner asked for", () => {
    expect(ADMIN_TABS.map((t) => t.label)).toEqual(["الرئيسية", "الطلبات", "البانرات", "الفئات", "المقالات", "الصفحات", "المنتجات", "المخزون", "الألوان", "التوصيل"]);
  });
  it("has the banners tab before the categories tab", () => {
    const hrefs = ADMIN_TABS.map((t) => t.href as string);
    expect(hrefs.indexOf("/admin/banners")).toBeGreaterThan(-1);
    expect(hrefs.indexOf("/admin/banners")).toBeLessThan(hrefs.indexOf("/admin/categories"));
  });
});

describe("activeTab", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/orders", "/admin/orders"],
    ["/admin/orders/123/print", "/admin/orders"],
    ["/admin/banners", "/admin/banners"],
    ["/admin/banners/new", "/admin/banners"],
    ["/admin/categories", "/admin/categories"],
    ["/admin/categories/new", "/admin/categories"],
    ["/admin/categories/abc", "/admin/categories"],
    ["/admin/articles", "/admin/articles"],
    ["/admin/articles/new", "/admin/articles"],
    ["/admin/pages", "/admin/pages"],
    ["/admin/pages/about", "/admin/pages"],
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
