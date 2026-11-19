import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";

// A local Postgres (PGlite) that looks enough like Supabase to run our SQL files: the roles, the auth.jwt()
// function and the storage tables the migrations use. Dev and tests only.
const STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb
  $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean default false);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
`;

const root = process.cwd();
export const readSql = (rel: string) => readFileSync(path.join(root, rel), "utf8");

export async function createDb(migrations: string[]): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(STUBS);
  for (const file of migrations) await db.exec(readSql(`supabase/migrations/${file}`));
  return db;
}

export const BASE_MIGRATIONS = ["0001_init.sql", "0002_grants.sql", "0003_product_filters.sql"];
