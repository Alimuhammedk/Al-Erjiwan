import { describe, expect, it } from "vitest";
import { BASE_MIGRATIONS, createDb, readSql } from "./db/harness";

const MIGRATIONS = [
  ...BASE_MIGRATIONS, "0004_orders.sql", "0005_order_changes.sql", "0006_colours.sql", "0007_product_colours.sql", "0008_articles.sql",
  "0009_languages_and_pages.sql", "0010_remove_delivery_companies.sql",
];
const count = async (db: Awaited<ReturnType<typeof createDb>>, table: string) =>
  (await db.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0].n;

describe("supabase/seed/clear-for-launch.sql", () => {
  it("empties the shop and keeps fees, settings, pages and admins", async () => {
    const db = await createDb(MIGRATIONS);
    try {
      await db.exec(`
        insert into public.categories (id, name_ar) values ('a0000000-0000-4000-8000-000000000001', 'فئة');
        insert into public.colours (id, name_ar, hex) values ('a0000000-0000-4000-8000-000000000002', 'لون', '#ffffff');
        insert into public.products (id, name_ar, base_price, stock, category_id) values ('a0000000-0000-4000-8000-000000000003', 'منتج', 10000, 5, 'a0000000-0000-4000-8000-000000000001');
        insert into public.product_images (product_id, url) values ('a0000000-0000-4000-8000-000000000003', 'https://x/a.webp');
        insert into public.product_colours (product_id, colour_id) values ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002');
        insert into public.banners (image_url) values ('https://x/b.webp');
        insert into public.articles (title, body, cover_url) values ('مقال', 'نص', 'https://x/c.webp');
        insert into public.delivery_zones (governorate_ar, fee, min_order) values ('محافظة تجريبية', 5000, 0);
        select public.place_order('زبون', '07701234567', 'محافظة تجريبية', 'الكفل', 'عنوان', 'قرب الجامع', null,
          '[{"product_id":"a0000000-0000-4000-8000-000000000003","quantity":1}]'::jsonb);
      `);
      for (const t of ["orders", "order_items", "stock_movements", "products", "product_images", "product_colours", "categories", "banners", "colours", "articles"]) {
        expect(await count(db, t), `${t} before`).toBeGreaterThan(0);
      }
      const keep = { delivery_zones: await count(db, "delivery_zones"), settings: await count(db, "settings"), site_pages: await count(db, "site_pages"), admins: await count(db, "admins") };

      await db.exec(readSql("supabase/seed/clear-for-launch.sql"));

      for (const t of ["orders", "order_items", "stock_movements", "products", "product_images", "product_variants", "product_colours", "categories", "banners", "colours", "articles"]) {
        expect(await count(db, t), `${t} after`).toBe(0);
      }
      for (const [t, n] of Object.entries(keep)) expect(await count(db, t), `${t} kept`).toBe(n);
    } finally {
      await db.close();
    }
  }, 90_000);
});
