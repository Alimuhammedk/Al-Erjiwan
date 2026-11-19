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
