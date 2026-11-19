import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  rpc: vi.fn(),
  update: vi.fn(),
  order: { value: { governorate: "بغداد" } as { governorate: string } | null },
  upsert: vi.fn(),
  del: vi.fn(),
  company: { value: null as unknown },
}));
const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/auth", () => guard);
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: async () => ({
    rpc: db.rpc,
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === "orders" ? db.order.value : db.company.value, error: null }) }) }),
      update: (v: unknown) => ({ eq: (c: string, id: string) => db.update(v, c, id) }),
      upsert: (v: unknown, o: unknown) => db.upsert(table, v, o),
      delete: () => ({ eq: (c: string, id: string) => db.del(table, c, id) }),
    }),
  }),
}));

import { ar } from "@/content/ar";
import { DEFAULT_TEMPLATES } from "@/lib/admin/orders";
import {
  assignDeliveryCompanyAction,
  deleteOrderAction,
  saveMessageTemplateAction,
  saveOrderNotesAction,
  setOrderStatusAction,
} from "../../app/admin/(protected)/orders/actions";

const ID = "123e4567-e89b-12d3-a456-426614174000";
const CID = "223e4567-e89b-12d3-a456-426614174001";
const form = (f: Record<string, string>) => {
  const d = new FormData();
  Object.entries(f).forEach(([k, v]) => d.set(k, v));
  return d;
};

beforeEach(() => {
  vi.clearAllMocks();
  guard.requireAdmin.mockResolvedValue({ id: "admin" });
  db.rpc.mockResolvedValue({ error: null });
  db.update.mockResolvedValue({ error: null });
  db.upsert.mockResolvedValue({ error: null });
  db.del.mockResolvedValue({ error: null });
  db.order.value = { governorate: "بغداد" };
  db.company.value = {
    name: "شركة النور",
    delivery_company_prices: [
      { price: "4000", delivery_zones: { governorate_ar: "بغداد" } },
      { price: "7000", delivery_zones: { governorate_ar: "البصرة" } },
    ],
  };
});

describe("setOrderStatusAction", () => {
  it("asks the database to change the status, after checking the admin", async () => {
    expect(await setOrderStatusAction(ID, "confirmed")).toEqual({});
    expect(guard.requireAdmin).toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledWith("set_order_status", { p_order: ID, p_status: "confirmed" });
  });
  it.each(["new", "confirmed", "shipped", "delivered", "cancelled", "returned"])("accepts %s", async (s) => {
    expect(await setOrderStatusAction(ID, s)).toEqual({});
  });
  it("refuses an unknown status or a malformed id before the database", async () => {
    expect((await setOrderStatusAction(ID, "hacked")).error).toBe(ar.admin.orders.statusError);
    expect((await setOrderStatusAction("nope", "confirmed")).error).toBe(ar.admin.orders.statusError);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("names the product when a reopen is refused because it sold out", async () => {
    db.rpc.mockResolvedValue({ error: { message: "OUT_OF_STOCK:بنتلايت داخلي" } });
    expect((await setOrderStatusAction(ID, "new")).error).toBe("نفدت كمية بنتلايت داخلي، لا يمكن إعادة الطلب");
  });
  it("explains the same-status case, and hides other database text", async () => {
    db.rpc.mockResolvedValue({ error: { message: "INVALID_TRANSITION" } });
    expect((await setOrderStatusAction(ID, "new")).error).toBe(ar.admin.orders.statusError);
    db.rpc.mockResolvedValue({ error: { message: 'relation "x" does not exist' } });
    expect((await setOrderStatusAction(ID, "confirmed")).error).toBe(ar.admin.errors.saveFailed);
  });
  it("does nothing when the visitor is not an admin", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(setOrderStatusAction(ID, "confirmed")).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.rpc).not.toHaveBeenCalled();
  });
});

describe("saveOrderNotesAction", () => {
  it("saves the notes trimmed, and turns an empty one into nothing", async () => {
    expect(await saveOrderNotesAction(ID, {}, form({ delivery_notes: "  الدفع للسائق " }))).toEqual({});
    expect(db.update).toHaveBeenCalledWith({ delivery_notes: "الدفع للسائق" }, "id", ID);
    await saveOrderNotesAction(ID, {}, form({ delivery_notes: "  " }));
    expect(db.update).toHaveBeenLastCalledWith({ delivery_notes: null }, "id", ID);
  });
  it("rejects an over-long note and writes nothing", async () => {
    const r = await saveOrderNotesAction(ID, {}, form({ delivery_notes: "ا".repeat(1001) }));
    expect(Object.keys(r.errors ?? {})).toEqual(["delivery_notes"]);
    expect(db.update).not.toHaveBeenCalled();
  });
  it("shows a save error when the database refuses", async () => {
    db.update.mockResolvedValue({ error: { message: "x" } });
    expect((await saveOrderNotesAction(ID, {}, form({}))).error).toBe(ar.admin.errors.saveFailed);
  });
  it("refuses a malformed id and non-admins", async () => {
    expect((await saveOrderNotesAction("nope", {}, form({}))).error).toBe(ar.admin.errors.saveFailed);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveOrderNotesAction(ID, {}, form({}))).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("deleteOrderAction", () => {
  it("deletes through the database function, whatever the order's status", async () => {
    expect(await deleteOrderAction(ID)).toEqual({});
    expect(db.rpc).toHaveBeenCalledWith("delete_order", { p_order: ID });
  });
  it("reports an order that does not exist, hides other errors, and refuses a bad id", async () => {
    db.rpc.mockResolvedValue({ error: { message: "NOT_FOUND" } });
    expect((await deleteOrderAction(ID)).error).toBe(ar.admin.orders.notFound);
    db.rpc.mockResolvedValue({ error: { message: "boom" } });
    expect((await deleteOrderAction(ID)).error).toBe(ar.admin.errors.saveFailed);
    expect((await deleteOrderAction("nope")).error).toBe(ar.admin.orders.notFound);
  });
  it("refuses non-admins", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(deleteOrderAction(ID)).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.rpc).not.toHaveBeenCalled();
  });
});

describe("assignDeliveryCompanyAction", () => {
  it("stores the company, its name and its price for the order's governorate", async () => {
    expect(await assignDeliveryCompanyAction(ID, CID)).toEqual({});
    expect(db.update).toHaveBeenCalledWith({ delivery_company_id: CID, delivery_company: "شركة النور", delivery_cost: 4000 }, "id", ID);
  });
  it("stores no cost when the company has no price for that governorate", async () => {
    db.order.value = { governorate: "بابل" };
    await assignDeliveryCompanyAction(ID, CID);
    expect(db.update).toHaveBeenCalledWith({ delivery_company_id: CID, delivery_company: "شركة النور", delivery_cost: null }, "id", ID);
  });
  it("clearing the company clears all three values", async () => {
    await assignDeliveryCompanyAction(ID, null);
    expect(db.update).toHaveBeenCalledWith({ delivery_company_id: null, delivery_company: null, delivery_cost: null }, "id", ID);
  });
  it("fails clearly when the order or the company is missing, or a database write fails", async () => {
    db.order.value = null;
    expect((await assignDeliveryCompanyAction(ID, CID)).error).toBe(ar.admin.orders.notFound);
    db.order.value = { governorate: "بغداد" };
    db.company.value = null;
    expect((await assignDeliveryCompanyAction(ID, CID)).error).toBe(ar.admin.errors.saveFailed);
    db.company.value = { name: "x", delivery_company_prices: [] };
    db.update.mockResolvedValue({ error: { message: "x" } });
    expect((await assignDeliveryCompanyAction(ID, CID)).error).toBe(ar.admin.errors.saveFailed);
  });
  it("refuses bad ids and non-admins before touching the database", async () => {
    expect((await assignDeliveryCompanyAction("nope", CID)).error).toBe(ar.admin.errors.saveFailed);
    expect((await assignDeliveryCompanyAction(ID, "nope")).error).toBe(ar.admin.errors.saveFailed);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(assignDeliveryCompanyAction(ID, CID)).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("saveMessageTemplateAction", () => {
  it("saves the owner's wording under the setting for that message", async () => {
    expect(await saveMessageTemplateAction("confirm", "  أهلاً {name}  ")).toEqual({});
    expect(db.upsert).toHaveBeenCalledWith("settings", { key: "message_confirm", value: "أهلاً {name}" }, { onConflict: "key" });
    await saveMessageTemplateAction("update", "تحديث {status}");
    expect(db.upsert).toHaveBeenLastCalledWith("settings", { key: "message_update", value: "تحديث {status}" }, { onConflict: "key" });
  });
  it("saving the built-in text or nothing removes the preset instead", async () => {
    await saveMessageTemplateAction("confirm", DEFAULT_TEMPLATES.confirm);
    expect(db.del).toHaveBeenCalledWith("settings", "key", "message_confirm");
    await saveMessageTemplateAction("update", "   ");
    expect(db.del).toHaveBeenLastCalledWith("settings", "key", "message_update");
    expect(db.upsert).not.toHaveBeenCalled();
  });
  it("refuses an unknown kind and a text that is too long", async () => {
    expect((await saveMessageTemplateAction("delivery", "x")).error).toBe(ar.admin.errors.saveFailed);
    expect((await saveMessageTemplateAction("confirm", "ا".repeat(1501))).error).toBe(ar.admin.errors.tooLong);
    expect(db.upsert).not.toHaveBeenCalled();
    expect(db.del).not.toHaveBeenCalled();
  });
  it("shows a save error, and refuses non-admins", async () => {
    db.upsert.mockResolvedValue({ error: { message: "x" } });
    expect((await saveMessageTemplateAction("confirm", "نص")).error).toBe(ar.admin.errors.saveFailed);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveMessageTemplateAction("confirm", "نص")).rejects.toThrow("REDIRECT:/admin/login");
  });
});
