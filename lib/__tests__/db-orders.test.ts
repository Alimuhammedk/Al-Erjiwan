import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BASE_MIGRATIONS, createDb, readSql } from "./db/harness";

// Runs the real SQL test script for orders, stock and tracking against a local Postgres.
// The same script is what the owner pastes into Supabase after running 0004_orders.sql.
let db: PGlite;
beforeAll(async () => {
  db = await createDb([...BASE_MIGRATIONS, "0004_orders.sql"]);
}, 60_000);
afterAll(() => db.close());

describe("0004_orders.sql", () => {
  it("passes every check in supabase/tests/0004_orders_test.sql", async () => {
    const results = await db.exec(readSql("supabase/tests/0004_orders_test.sql"));
    expect((results.at(-1)?.rows[0] as { result: string }).result).toBe("ALL PASSED");
  }, 60_000);

  it("leaves no test data behind (the script ends in rollback)", async () => {
    for (const table of ["orders", "order_items", "products", "stock_movements", "colours"]) {
      const r = await db.query<{ n: number }>(`select count(*)::int as n from public.${table}`);
      expect(r.rows[0].n, table).toBe(0);
    }
  });
});

describe("0005_order_changes.sql", () => {
  it("passes every check in supabase/tests/0005_order_changes_test.sql", async () => {
    const db5 = await createDb([...BASE_MIGRATIONS, "0004_orders.sql", "0005_order_changes.sql"]);
    try {
      const results = await db5.exec(readSql("supabase/tests/0005_order_changes_test.sql"));
      expect((results.at(-1)?.rows[0] as { result: string }).result).toBe("ALL PASSED");
    } finally {
      await db5.close();
    }
  }, 90_000);
});

describe("0006_colours.sql", () => {
  it("passes every check in supabase/tests/0006_colours_test.sql", async () => {
    const db6 = await createDb([...BASE_MIGRATIONS, "0004_orders.sql", "0005_order_changes.sql", "0006_colours.sql"]);
    try {
      const results = await db6.exec(readSql("supabase/tests/0006_colours_test.sql"));
      expect((results.at(-1)?.rows[0] as { result: string }).result).toBe("ALL PASSED");
    } finally {
      await db6.close();
    }
  }, 90_000);
});

describe("supabase/seed/sample-colours.sql", () => {
  it("loads, can be run twice without duplicates, and the removal line takes them all away", async () => {
    const db = await createDb([...BASE_MIGRATIONS, "0004_orders.sql", "0005_order_changes.sql", "0006_colours.sql"]);
    try {
      const sql = readSql("supabase/seed/sample-colours.sql");
      await db.exec(sql);
      await db.exec(sql);
      const count = async () => (await db.query<{ n: number }>("select count(*)::int as n from public.colours where system = 'عينة'")).rows[0].n;
      expect(await count()).toBe(51);
      const near = await db.query<{ code: string }>("select code from public.closest_colours('#bfe0f2', 1)");
      expect(near.rows[0].code).toBeTruthy();
      await db.exec("delete from public.colours where system = 'عينة'");
      expect(await count()).toBe(0);
    } finally {
      await db.close();
    }
  }, 90_000);
});
