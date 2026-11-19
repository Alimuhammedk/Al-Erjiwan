import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  status: { value: "cancelled" as string | null },
}));
const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/auth", () => guard);
vi.mock("@/lib/supabase/auth-server", () => ({ createAuthClient: async () => ({ rpc: db.rpc, from: db.from }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { ar } from "@/content/ar";
import { deleteOrderAction, saveOrderNotesAction, setOrderStatusAction } from "../../app/admin/(protected)/orders/actions";

const ID = "123e4567-e89b-12d3-a456-426614174000";
const form = (f: Record<string, string>) => {
  const d = new FormData();
  Object.entries(f).forEach(([k, v]) => d.set(k, v));
  return d;
};

beforeEach(() => {
  vi.clearAllMocks();
  db.status.value = "cancelled";
  guard.requireAdmin.mockResolvedValue({ id: "admin" });
  db.rpc.mockResolvedValue({ error: null });
  db.update.mockResolvedValue({ error: null });
  db.del.mockResolvedValue({ error: null });
  db.from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.status.value ? { status: db.status.value } : null, error: null }) }) }),
    update: (v: unknown) => ({ eq: (c: string, id: string) => db.update(v, c, id) }),
    delete: () => ({ eq: (c: string, id: string) => db.del(c, id) }),
  }));
});

describe("setOrderStatusAction", () => {
  it("asks the database to change the status, after checking the admin", async () => {
    expect(await setOrderStatusAction(ID, "confirmed")).toEqual({});
    expect(guard.requireAdmin).toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledWith("set_order_status", { p_order: ID, p_status: "confirmed" });
  });
  it("refuses an unknown status or a malformed id before the database", async () => {
    expect((await setOrderStatusAction(ID, "hacked")).error).toBe(ar.admin.orders.statusError);
    expect((await setOrderStatusAction("nope", "confirmed")).error).toBe(ar.admin.orders.statusError);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("explains a move that is not allowed, and hides other database text", async () => {
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
  it("saves the three notes, trimmed, and turns empty ones into nothing", async () => {
    const r = await saveOrderNotesAction(ID, {}, form({ delivery_company: "  شركة النور ", tracking_note: "", internal_note: "اتصل مساءً" }));
    expect(r).toEqual({});
    expect(db.update).toHaveBeenCalledWith({ delivery_company: "شركة النور", tracking_note: null, internal_note: "اتصل مساءً" }, "id", ID);
  });
  it("rejects over-long notes and writes nothing", async () => {
    const r = await saveOrderNotesAction(ID, {}, form({ delivery_company: "ا".repeat(101), tracking_note: "ا".repeat(201), internal_note: "ا".repeat(1001) }));
    expect(Object.keys(r.errors ?? {}).sort()).toEqual(["delivery_company", "internal_note", "tracking_note"]);
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
  it("deletes a cancelled order and goes back to the list", async () => {
    await expect(deleteOrderAction(ID)).rejects.toThrow("REDIRECT:/admin/orders");
    expect(db.del).toHaveBeenCalledWith("id", ID);
  });
  it.each(["new", "confirmed", "shipped", "delivered", "returned"])("never deletes a %s order", async (status) => {
    db.status.value = status;
    const r = await deleteOrderAction(ID);
    expect(r?.error).toBe(ar.admin.orders.statusError);
    expect(db.del).not.toHaveBeenCalled();
  });
  it("reports an order that does not exist and refuses non-admins", async () => {
    db.status.value = null;
    expect((await deleteOrderAction(ID))?.error).toBe(ar.admin.orders.notFound);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(deleteOrderAction(ID)).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.del).not.toHaveBeenCalled();
  });
});
