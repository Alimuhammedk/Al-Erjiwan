import { describe, expect, it } from "vitest";
import { ar } from "@/content/ar";
import { parseDashboardStats } from "../admin/dashboard";
import { parseAmount, planStockChange, stockLevel } from "../admin/stock";

const t = ar.admin.stock;

describe("stockLevel", () => {
  it("is out at zero, low up to the threshold, and ok above it", () => {
    expect(stockLevel(0, 5)).toBe("out");
    expect(stockLevel(-1, 5)).toBe("out");
    expect(stockLevel(1, 5)).toBe("low");
    expect(stockLevel(5, 5)).toBe("low");
    expect(stockLevel(6, 5)).toBe("ok");
  });
});

describe("parseAmount", () => {
  it.each([["12", 12], ["٢٥", 25], ["1,000", 1000], [" 7 ", 7], ["0", 0], ["100000", 100000]])("reads %j as %i", (input, n) => {
    expect(parseAmount(input)).toBe(n);
  });
  it.each(["", "-1", "1.5", "abc", "100001", "1e3", "١٢٣٤٥٦٧"])("refuses %j", (input) => expect(parseAmount(input)).toBeNull());
});

describe("planStockChange", () => {
  it("add: a positive change logged as manual", () => {
    expect(planStockChange("add", "10", 3)).toEqual({ ok: true, delta: 10, reason: "manual", note: t.noteArrived });
  });
  it("shop sale: a negative change logged as a shop sale", () => {
    expect(planStockChange("shop_sale", "٢", 9)).toEqual({ ok: true, delta: -2, reason: "shop_sale", note: null });
  });
  it("set: the difference from the current number, up or down", () => {
    expect(planStockChange("set", "20", 3)).toMatchObject({ ok: true, delta: 17, reason: "manual" });
    expect(planStockChange("set", "0", 3)).toMatchObject({ ok: true, delta: -3 });
  });
  it("set to the same number is not a change", () => {
    expect(planStockChange("set", "3", 3)).toEqual({ ok: false, error: t.noChange });
  });
  it("refuses zero for add and sale, bad numbers, and unknown modes", () => {
    expect(planStockChange("add", "0", 3)).toEqual({ ok: false, error: t.invalidAmount });
    expect(planStockChange("shop_sale", "0", 3)).toEqual({ ok: false, error: t.invalidAmount });
    expect(planStockChange("add", "x", 3)).toEqual({ ok: false, error: t.invalidAmount });
    expect(planStockChange("add", "-4", 3)).toEqual({ ok: false, error: t.invalidAmount });
    expect(planStockChange("hack", "4", 3)).toEqual({ ok: false, error: t.invalidAmount });
  });
});

describe("parseDashboardStats", () => {
  it("fills the statuses the database left out with 0 and keeps all six", () => {
    const s = parseDashboardStats({ by_status: { new: 3, delivered: "2" } });
    expect(s?.byStatus).toEqual({ new: 3, confirmed: 0, shipped: 0, delivered: 2, cancelled: 0, returned: 0 });
  });
  it("turns every number into a number", () => {
    const s = parseDashboardStats({
      new_orders: "4", orders_today: 2, sales_today: "123000", sales_month: 900000,
      stock_summary: { available: 10, low: "2", out: 1 },
      low_stock: [{ name: "بنتلايت", size: "4 لتر", stock: "1" }, { name: "فرشاة", size: null, stock: 0 }],
      best_sellers: [{ name: "بنتلايت", quantity: "7" }],
    });
    expect(s).toMatchObject({ newOrders: 4, ordersToday: 2, salesToday: 123000, salesMonth: 900000, stock: { available: 10, low: 2, out: 1 } });
    expect(s?.lowStock).toEqual([{ name: "بنتلايت", size: "4 لتر", stock: 1 }, { name: "فرشاة", size: null, stock: 0 }]);
    expect(s?.bestSellers).toEqual([{ name: "بنتلايت", quantity: 7 }]);
  });
  it("copes with an empty or odd answer, and gives null when there is none", () => {
    expect(parseDashboardStats({})).toMatchObject({ newOrders: 0, salesMonth: 0, lowStock: [], bestSellers: [], stock: { available: 0, low: 0, out: 0 } });
    expect(parseDashboardStats({ low_stock: "x", sales_today: "abc", by_status: [] })).toMatchObject({ lowStock: [], salesToday: 0 });
    for (const bad of [null, undefined, "x", 5, []]) expect(parseDashboardStats(bad)).toBeNull();
  });
});
