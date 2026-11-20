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
import { saveZonesAction } from "../../app/admin/(protected)/delivery-fees/actions";

const Z1 = "123e4567-e89b-12d3-a456-426614174001";
const Z2 = "123e4567-e89b-12d3-a456-426614174002";
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
