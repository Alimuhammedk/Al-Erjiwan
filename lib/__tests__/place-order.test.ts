import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
const state = vi.hoisted(() => ({ noClient: false, lang: undefined as string | undefined }));

vi.mock("@/lib/supabase/server", () => ({ createServerClient: () => (state.noClient ? null : client) }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (state.lang ? { value: state.lang } : undefined) }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { ar } from "@/content/ar";
import { en } from "@/content/en";
import { placeOrderAction } from "../../app/(site)/checkout/actions";

const e = ar.checkout.errors;
const P = "123e4567-e89b-12d3-a456-426614174000";
const V = "223e4567-e89b-12d3-a456-426614174001";
const line = { product_id: P, variant_id: V, colour_id: null, colour_note: null, quantity: 2 };

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}
const good = {
  customer_name: "علي حسين",
  phone: "0770 123 4567",
  governorate: "بغداد",
  city: "الكفل",
  landmark: "قرب الجامع",
  notes: "",
  items: JSON.stringify([line]),
};

beforeEach(() => {
  vi.clearAllMocks();
  state.noClient = false;
  state.lang = undefined;
  client.rpc.mockResolvedValue({ data: "ABCD1234", error: null });
});

describe("placeOrderAction", () => {
  it("places the order through the database and opens the confirmation page", async () => {
    await expect(placeOrderAction({}, form(good))).rejects.toThrow("REDIRECT:/order/ABCD1234");
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith("place_order", {
      p_name: "علي حسين",
      p_phone: "07701234567",
      p_governorate: "بغداد",
      p_city: "الكفل",
      p_address: "الكفل - قرب الجامع",
      p_landmark: "قرب الجامع",
      p_notes: null,
      p_items: [line],
    });
  });

  it("never forwards a price, total or fee sent by the browser", async () => {
    const f = form({ ...good, price: "1", total: "1", delivery_fee: "0", items: JSON.stringify([{ ...line, price: 1, unit_price: 1, total: 1 }]) });
    await expect(placeOrderAction({}, f)).rejects.toThrow("REDIRECT:");
    const [, args] = client.rpc.mock.calls[0];
    expect(Object.keys(args).sort()).toEqual(["p_address", "p_city", "p_governorate", "p_items", "p_landmark", "p_name", "p_notes", "p_phone"]);
    expect(JSON.stringify(args)).not.toMatch(/price|total|fee/);
  });

  it("returns field errors and never calls the database for bad details", async () => {
    const r = await placeOrderAction({}, form({ ...good, customer_name: "", phone: "123", governorate: "" }));
    expect(r.errors).toMatchObject({ customer_name: e.name, phone: e.phone, governorate: e.governorate });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("refuses an empty, broken or oversized cart before the database", async () => {
    expect((await placeOrderAction({}, form({ ...good, items: "[]" }))).error).toBe(e.emptyCart);
    expect((await placeOrderAction({}, form({ ...good, items: "{bad" }))).error).toBe(e.invalidItems);
    expect((await placeOrderAction({}, form({ ...good, items: JSON.stringify(Array(51).fill(line)) }))).error).toBe(e.invalidItems);
    expect((await placeOrderAction({}, form({ ...good, items: JSON.stringify([{ ...line, quantity: 100 }]) }))).error).toBe(e.invalidItems);
    const withoutItems: Record<string, string> = { ...good };
    delete withoutItems.items;
    expect((await placeOrderAction({}, form(withoutItems))).error).toBe(e.invalidItems);
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("tells the customer which product ran out", async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: "OUT_OF_STOCK:بنتلايت" } });
    expect((await placeOrderAction({}, form(good))).error).toBe("نفدت كمية بنتلايت، يرجى تعديل السلة");
  });

  it("shows a friendly message for every database refusal, never raw text", async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: 'permission denied for table "orders"' } });
    expect((await placeOrderAction({}, form(good))).error).toBe(e.generic);
    client.rpc.mockResolvedValue({ data: null, error: { message: "MIN_ORDER" } });
    expect((await placeOrderAction({}, form(good))).error).toBe(e.minOrder);
  });

  it("copes with a missing database connection, a network failure and an odd answer", async () => {
    state.noClient = true;
    expect((await placeOrderAction({}, form(good))).error).toBe(e.generic);
    state.noClient = false;
  state.lang = undefined;
    client.rpc.mockRejectedValue(new Error("network down"));
    expect((await placeOrderAction({}, form(good))).error).toBe(e.generic);
    client.rpc.mockResolvedValue({ data: { weird: true }, error: null });
    expect((await placeOrderAction({}, form(good))).error).toBe(e.generic);
  });
});

describe("placeOrderAction in English", () => {
  it("returns field errors and database messages in English when the customer chose English", async () => {
    state.lang = "en";
    const r = await placeOrderAction({}, form({ ...good, customer_name: "", phone: "123" }));
    expect(r.errors).toMatchObject({ customer_name: en.checkout.errors.name, phone: en.checkout.errors.phone });
    client.rpc.mockResolvedValue({ data: null, error: { message: "OUT_OF_STOCK:Pentalite" } });
    expect((await placeOrderAction({}, form(good))).error).toBe("Pentalite is sold out, please change the cart");
    client.rpc.mockRejectedValue(new Error("network down"));
    expect((await placeOrderAction({}, form(good))).error).toBe(en.checkout.errors.generic);
  });
  it("stays Arabic for any other cookie value", async () => {
    state.lang = "fr";
    const r = await placeOrderAction({}, form({ ...good, customer_name: "" }));
    expect(r.errors?.customer_name).toBe(ar.checkout.errors.name);
  });
});
