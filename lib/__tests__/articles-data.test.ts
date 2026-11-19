import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ db: null as unknown, calls: [] as unknown[][] }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: () => state.db }));

import { getArticle, getHomeArticles } from "../data/articles";

const ID = "123e4567-e89b-12d3-a456-426614174000";
const row = { id: ID, title: "عنوان", excerpt: null, body: "نص", cover_url: "https://x/a.webp", images: [], is_published: true, published_at: "2026-11-20T10:00:00Z", updated_at: "2026-11-20T10:00:00Z" };

function fake(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void) => resolve({ data: result.data ?? null, error: result.error ?? null }),
    maybeSingle: async () => ({ data: result.data ?? null, error: result.error ?? null }),
  };
  for (const m of ["select", "eq", "order", "limit"]) {
    chain[m] = (...a: unknown[]) => {
      state.calls.push([m, ...a]);
      return chain;
    };
  }
  return { from: () => chain };
}

beforeEach(() => {
  state.calls = [];
  state.db = fake({ data: [row] });
});

describe("getHomeArticles", () => {
  it("returns the newest published articles, newest first, at most 8 by default", async () => {
    expect(await getHomeArticles()).toEqual([row]);
    expect(state.calls).toContainEqual(["eq", "is_published", true]);
    expect(state.calls).toContainEqual(["order", "published_at", { ascending: false }]);
    expect(state.calls).toContainEqual(["limit", 8]);
  });
  it("is empty on an error, with no database, or when the database throws", async () => {
    state.db = fake({ error: { message: "x" } });
    expect(await getHomeArticles()).toEqual([]);
    state.db = null;
    expect(await getHomeArticles()).toEqual([]);
    state.db = { from: () => { throw new Error("down"); } };
    expect(await getHomeArticles()).toEqual([]);
  });
});

describe("getArticle", () => {
  it("returns a published article", async () => {
    state.db = fake({ data: row });
    expect(await getArticle(ID)).toEqual(row);
    expect(state.calls).toContainEqual(["eq", "is_published", true]);
  });
  it("is null for a bad id, a draft, a missing article, an error or no database", async () => {
    expect(await getArticle("nope")).toBeNull();
    state.db = fake({ data: { ...row, is_published: false } });
    expect(await getArticle(ID)).toBeNull();
    state.db = fake({ data: null });
    expect(await getArticle(ID)).toBeNull();
    state.db = fake({ error: { message: "x" }, data: row });
    expect(await getArticle(ID)).toBeNull();
    state.db = null;
    expect(await getArticle(ID)).toBeNull();
  });
});
