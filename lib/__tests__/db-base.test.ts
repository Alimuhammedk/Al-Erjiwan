import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BASE_MIGRATIONS, createDb } from "./db/harness";

// The existing database files (0001 to 0003) run in a local Postgres and behave as designed.
let db: PGlite;
beforeAll(async () => {
  db = await createDb(BASE_MIGRATIONS);
}, 60_000);
afterAll(() => db.close());

const q = async (sql: string) => (await db.query<Record<string, unknown>>(sql)).rows;

describe("base schema", () => {
  it("creates the tables and the 18 delivery zones", async () => {
    expect((await q("select count(*)::int as n from public.delivery_zones"))[0].n).toBe(18);
    expect((await q("select count(*)::int as n from public.admins"))[0].n).toBe(1);
  });

  it("is_admin is true only for an email in the admins table", async () => {
    await db.exec(`select set_config('request.jwt.claims', '{"email":"MHMDKBYHANLY@gmail.com"}', false)`);
    expect((await q("select public.is_admin() as a"))[0].a).toBe(true);
    await db.exec(`select set_config('request.jwt.claims', '{"email":"someone@else.com"}', false)`);
    expect((await q("select public.is_admin() as a"))[0].a).toBe(false);
    await db.exec(`select set_config('request.jwt.claims', '', false)`);
    expect((await q("select public.is_admin() as a"))[0].a).toBe(false);
  });

  it("the public role can read delivery zones but not orders", async () => {
    await db.exec("set role anon");
    try {
      expect((await q("select count(*)::int as n from public.delivery_zones"))[0].n).toBe(18);
      await expect(q("select * from public.orders")).rejects.toThrow(/permission denied/i);
      await expect(q("select * from public.admins")).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec("reset role");
    }
  });
});
