import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
const state = vi.hoisted(() => ({ noClient: false }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: () => (state.noClient ? null : client) }));

import { getDeliveryZones, getOrderSummary, trackOrder } from "../data/orders";

// from("delivery_zones").select(...).eq(...).order(...) -> awaited result
function zones(result: unknown) {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  b.order = () => Promise.resolve(result);
  client.from.mockReturnValue(b);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.noClient = false;
});

describe("getDeliveryZones", () => {
  it("returns the active zones with numbers", async () => {
    zones({ data: [{ id: "z1", governorate_ar: "بغداد", fee: 5000, min_order: 0 }], error: null });
    expect(await getDeliveryZones()).toEqual([{ id: "z1", governorate_ar: "بغداد", fee: 5000, min_order: 0 }]);
  });
  it("returns [] on a database error", async () => {
    zones({ data: null, error: { message: "x" } });
    expect(await getDeliveryZones()).toEqual([]);
  });
  it("returns [] when there is no database connection", async () => {
    state.noClient = true;
    expect(await getDeliveryZones()).toEqual([]);
  });
  it("returns [] when the request throws", async () => {
    client.from.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(await getDeliveryZones()).toEqual([]);
  });
});

describe("getOrderSummary and trackOrder", () => {
  it("asks the database with a cleaned code", async () => {
    client.rpc.mockResolvedValue({ data: { status: "new" }, error: null });
    expect(await getOrderSummary(" abcd1234 ")).toEqual({ status: "new" });
    expect(client.rpc).toHaveBeenCalledWith("order_summary", { p_code: "ABCD1234" });
    await trackOrder("abcd1234", "0770 123 4567");
    expect(client.rpc).toHaveBeenLastCalledWith("track_order", { p_code: "ABCD1234", p_phone: "0770 123 4567" });
  });
  it("never asks the database about a code that cannot be real", async () => {
    for (const code of ["", "x", "ABC", "ABCD12345678", "AB CD 123", "../../etc", "a".repeat(500)]) {
      expect(await getOrderSummary(code)).toBeNull();
      expect(await trackOrder(code, "07701234567")).toBeNull();
    }
    expect(await trackOrder("ABCD1234", "")).toBeNull();
    expect(await trackOrder("ABCD1234", "9".repeat(100))).toBeNull();
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it("returns null on any failure", async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    expect(await getOrderSummary("ABCD1234")).toBeNull();
    client.rpc.mockRejectedValue(new Error("down"));
    expect(await trackOrder("ABCD1234", "07701234567")).toBeNull();
    state.noClient = true;
    expect(await getOrderSummary("ABCD1234")).toBeNull();
  });
});
