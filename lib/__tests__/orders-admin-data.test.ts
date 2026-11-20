import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), result: { value: {} as Record<string, unknown> } }));
vi.mock("@/lib/supabase/auth-server", () => ({ createAuthClient: async () => ({ from: db.from }) }));

import { getNewOrderCount, getOrder, getProblemOrderCount } from "../admin/orders-data";

// Any chain of filter calls, awaited, gives the scripted result.
function chain(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "neq", "in", "or", "order", "range"]) b[m] = () => b;
  b.maybeSingle = () => Promise.resolve(result);
  b.then = (resolve: (v: unknown) => void) => resolve(result);
  return b;
}

beforeEach(() => vi.clearAllMocks());

describe("getNewOrderCount", () => {
  it("returns the number of new orders", async () => {
    db.from.mockReturnValue(chain({ count: 3, error: null }));
    expect(await getNewOrderCount()).toBe(3);
  });
  it("returns 0 on an error or a missing count", async () => {
    db.from.mockReturnValue(chain({ count: null, error: { message: "x" } }));
    expect(await getNewOrderCount()).toBe(0);
    db.from.mockReturnValue(chain({ count: null, error: null }));
    expect(await getNewOrderCount()).toBe(0);
  });
  it("returns 0 when the request throws", async () => {
    db.from.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(await getNewOrderCount()).toBe(0);
  });
});

describe("getProblemOrderCount", () => {
  it("counts earlier cancelled or returned orders of the same phone", async () => {
    db.from.mockReturnValue(chain({ count: 2, error: null }));
    expect(await getProblemOrderCount("07701234567", "o1")).toBe(2);
  });
  it("is 0 on any failure", async () => {
    db.from.mockReturnValue(chain({ count: null, error: { message: "x" } }));
    expect(await getProblemOrderCount("07701234567", "o1")).toBe(0);
  });
});

describe("getOrder", () => {
  it("returns the order with its items as plain numbers", async () => {
    db.from.mockReturnValue(
      chain({
        data: {
          id: "o1", code: "ABCD1234", customer_name: "علي", phone: "07701234567", governorate: "بابل", city: null, address: "حي الجامعة",
          landmark: null, notes: null, subtotal: "8000", delivery_fee: "5000", total: "13000", status: "new",
          created_at: "2026-11-20T10:00:00Z", updated_at: "2026-11-20T10:00:00Z",
          order_items: [{ product_name: "منتج", size_label: null, colour_name: null, colour_code: null, colour_note: null, quantity: 1, unit_price: "8000" }],
        },
        error: null,
      }),
    );
    const o = await getOrder("123e4567-e89b-12d3-a456-426614174000");
    expect(o?.total).toBe(13000);
    expect(o?.items[0].unit_price).toBe(8000);
    expect(o).not.toHaveProperty("order_items");
  });
  it("returns null for a malformed id without asking, and for a missing order or an error", async () => {
    expect(await getOrder("nope")).toBeNull();
    expect(db.from).not.toHaveBeenCalled();
    db.from.mockReturnValue(chain({ data: null, error: null }));
    expect(await getOrder("123e4567-e89b-12d3-a456-426614174000")).toBeNull();
    db.from.mockReturnValue(chain({ data: null, error: { message: "x" } }));
    expect(await getOrder("123e4567-e89b-12d3-a456-426614174000")).toBeNull();
  });
});

import { listOrders } from "../admin/orders-data";

// A chain that remembers every call, then yields the scripted result when awaited.
function recording(result: unknown) {
  const calls: [string, unknown[]][] = [];
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "or", "order", "range"]) b[m] = (...args: unknown[]) => (calls.push([m, args]), b);
  b.then = (resolve: (v: unknown) => void) => resolve(result);
  return { b, calls };
}

describe("listOrders", () => {
  it("asks for the right page, newest first, with the filters", async () => {
    const { b, calls } = recording({ data: [], count: 0, error: null });
    db.from.mockReturnValue(b);
    await listOrders({ status: "shipped", q: "علي", page: 3 });
    expect(calls).toContainEqual(["eq", ["status", "shipped"]]);
    expect(calls).toContainEqual(["or", ["code.ilike.%علي%,customer_name.ilike.%علي%,phone.ilike.%علي%"]]);
    expect(calls).toContainEqual(["order", ["created_at", { ascending: false }]]);
    expect(calls).toContainEqual(["range", [40, 59]]);
  });
  it("adds no filter when none is chosen", async () => {
    const { b, calls } = recording({ data: [], count: 0, error: null });
    db.from.mockReturnValue(b);
    await listOrders({ status: null, q: "", page: 1 });
    expect(calls.some(([m]) => m === "eq" || m === "or")).toBe(false);
  });
  it("returns the orders with numbers and the total count", async () => {
    const { b } = recording({ data: [{ id: "o1", code: "ABCD1234", customer_name: "علي", phone: "0770", governorate: "بابل", total: "13000", status: "new", created_at: "x" }], count: 41, error: null });
    db.from.mockReturnValue(b);
    const r = await listOrders({ status: null, q: "", page: 1 });
    expect(r.total).toBe(41);
    expect(r.orders[0].total).toBe(13000);
  });
  it("returns an empty list on an error or a throw", async () => {
    db.from.mockReturnValue(recording({ data: null, count: null, error: { message: "x" } }).b);
    expect(await listOrders({ status: null, q: "", page: 1 })).toEqual({ orders: [], total: 0 });
    db.from.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(await listOrders({ status: null, q: "", page: 1 })).toEqual({ orders: [], total: 0 });
  });
});
