import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ log: [] as unknown[][], fail: new Set<string>(), insertedId: "323e4567-e89b-12d3-a456-426614174099" }));
const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/auth", () => guard);
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: async () => ({
    from: (table: string) => {
      const done = (op: string, ...args: unknown[]) => {
        calls.log.push([table, op, ...args]);
        return calls.fail.has(`${table}:${op}`) ? { error: { message: "x" }, data: null } : { error: null, data: null };
      };
      const del = (...a: unknown[]) => {
        const r = Promise.resolve(done("delete", ...a)) as Promise<unknown> & { not: (...n: unknown[]) => Promise<unknown> };
        r.not = (...n) => Promise.resolve(done("delete-not", ...a, ...n));
        return r;
      };
      return {
        update: (v: unknown) => ({ eq: (c: string, id: string) => Promise.resolve(done("update", v, c, id)) }),
        insert: (v: unknown) => ({
          select: () => ({
            single: async () => {
              const r = done("insert", v);
              return r.error ? r : { error: null, data: { id: calls.insertedId } };
            },
          }),
        }),
        upsert: (rows: unknown, opts: unknown) => Promise.resolve(done("upsert", rows, opts)),
        delete: () => ({ eq: (...a: unknown[]) => del(...a) }),
      };
    },
  }),
}));

import { ar } from "@/content/ar";
import { deleteCompanyAction, saveCompanyAction } from "../../app/admin/(protected)/delivery-companies/actions";
import { saveZonesAction } from "../../app/admin/(protected)/delivery-fees/actions";

const Z1 = "123e4567-e89b-12d3-a456-426614174001";
const Z2 = "123e4567-e89b-12d3-a456-426614174002";
const CID = "223e4567-e89b-12d3-a456-426614174001";
const form = (f: Record<string, string>) => {
  const d = new FormData();
  Object.entries(f).forEach(([k, v]) => d.set(k, v));
  return d;
};
const ops = (...names: string[]) => calls.log.filter((c) => names.includes(String(c[1])));

beforeEach(() => {
  calls.log.length = 0;
  calls.fail.clear();
  guard.requireAdmin.mockReset();
  guard.requireAdmin.mockResolvedValue({ id: "admin" });
});

describe("saveZonesAction", () => {
  const good = { ids: `${Z1},${Z2}`, [`fee_${Z1}`]: "5000", [`min_${Z1}`]: "20000", [`active_${Z1}`]: "on", [`fee_${Z2}`]: "٨٠٠٠" };
  it("updates every governorate by id with the cleaned values", async () => {
    expect(await saveZonesAction({}, form(good))).toEqual({});
    expect(ops("update")).toEqual([
      ["delivery_zones", "update", { fee: 5000, min_order: 20000, is_active: true }, "id", Z1],
      ["delivery_zones", "update", { fee: 8000, min_order: 0, is_active: false }, "id", Z2],
    ]);
  });
  it("writes nothing and names the field when an amount is wrong", async () => {
    const r = await saveZonesAction({}, form({ ...good, [`fee_${Z2}`]: "-3" }));
    expect(r.errors).toEqual({ [`fee_${Z2}`]: ar.admin.delivery.invalidAmount });
    expect(calls.log).toHaveLength(0);
  });
  it("reports a failed save", async () => {
    calls.fail.add("delivery_zones:update");
    expect((await saveZonesAction({}, form(good))).error).toBe(ar.admin.errors.saveFailed);
  });
  it("does nothing for a non-admin", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveZonesAction({}, form(good))).rejects.toThrow("REDIRECT:/admin/login");
    expect(calls.log).toHaveLength(0);
  });
});

describe("saveCompanyAction", () => {
  const good = { name: "شركة السرعة", whatsapp: "0780 123 4567", is_active: "on", ids: `${Z1},${Z2}`, [`price_${Z1}`]: "4000", [`price_${Z2}`]: "" };
  const company = { name: "شركة السرعة", whatsapp: "07801234567", notes: null, is_active: true };

  it("creates a company, saves its typed prices, removes other prices and goes back to the list", async () => {
    await expect(saveCompanyAction(null, {}, form(good))).rejects.toThrow("REDIRECT:/admin/delivery-companies");
    expect(calls.log[0]).toEqual(["delivery_companies", "insert", company]);
    expect(ops("upsert")).toEqual([
      ["delivery_company_prices", "upsert", [{ company_id: calls.insertedId, zone_id: Z1, price: 4000 }], { onConflict: "company_id,zone_id" }],
    ]);
    expect(ops("delete-not")).toEqual([["delivery_company_prices", "delete-not", "company_id", calls.insertedId, "zone_id", "in", `(${Z1})`]]);
  });
  it("updates an existing company by id", async () => {
    await expect(saveCompanyAction(CID, {}, form(good))).rejects.toThrow("REDIRECT:");
    expect(calls.log[0]).toEqual(["delivery_companies", "update", company, "id", CID]);
    expect(ops("insert")).toHaveLength(0);
  });
  it("with no prices typed, removes all of the company's prices and saves none", async () => {
    await expect(saveCompanyAction(CID, {}, form({ ...good, [`price_${Z1}`]: "" }))).rejects.toThrow("REDIRECT:");
    expect(ops("upsert")).toHaveLength(0);
    expect(ops("delete")).toEqual([["delivery_company_prices", "delete", "company_id", CID]]);
  });
  it("returns field errors and writes nothing for bad input", async () => {
    const r = await saveCompanyAction(null, {}, form({ ...good, name: "", whatsapp: "1", [`price_${Z1}`]: "x" }));
    expect(Object.keys(r.errors ?? {}).sort()).toEqual(["name", `price_${Z1}`, "whatsapp"].sort());
    expect(calls.log).toHaveLength(0);
  });
  it.each(["delivery_companies:insert", "delivery_company_prices:upsert", "delivery_company_prices:delete-not"])("shows a save error when %s fails", async (key) => {
    calls.fail.add(key);
    expect((await saveCompanyAction(null, {}, form(good))).error).toBe(ar.admin.errors.saveFailed);
  });
  it("refuses a malformed id and non-admins", async () => {
    expect((await saveCompanyAction("nope", {}, form(good))).error).toBe(ar.admin.errors.saveFailed);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveCompanyAction(null, {}, form(good))).rejects.toThrow("REDIRECT:/admin/login");
    expect(calls.log).toHaveLength(0);
  });
});

describe("deleteCompanyAction", () => {
  it("deletes the company and returns to the list", async () => {
    await expect(deleteCompanyAction(CID)).rejects.toThrow("REDIRECT:/admin/delivery-companies");
    expect(calls.log).toEqual([["delivery_companies", "delete", "id", CID]]);
  });
  it("refuses a bad id and non-admins, and reports a failure", async () => {
    await expect(deleteCompanyAction("nope")).rejects.toThrow(ar.admin.errors.saveFailed);
    calls.fail.add("delivery_companies:delete");
    await expect(deleteCompanyAction(CID)).rejects.toThrow(ar.admin.errors.saveFailed);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(deleteCompanyAction(CID)).rejects.toThrow("REDIRECT:/admin/login");
  });
});
