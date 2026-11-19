import { beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.hoisted(() => ({ run: vi.fn(), db: { value: {} as object | null } }));
vi.mock("@/lib/colours/search", () => ({ runColourSearch: search.run }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: () => search.db.value }));

import { GET } from "../../app/api/colours/route";

const call = (qs: string) => GET(new Request(`http://localhost/api/colours${qs}`));

beforeEach(() => {
  vi.clearAllMocks();
  search.db.value = {};
  search.run.mockResolvedValue({ colours: [{ id: "1", name_ar: "أزرق", name_en: "Blue", code: "B1", hex: "#0000ff", family: "الأزرق", system: "JW" }], total: 1 });
});

describe("GET /api/colours", () => {
  it("returns the shades with only the fields the picker needs", async () => {
    const res = await call("?q=أزرق");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ colours: [{ id: "1", name_ar: "أزرق", code: "B1", hex: "#0000ff", family: "الأزرق", system: "JW" }] });
  });
  it("cleans the search before it reaches the database, and always asks for page 1", async () => {
    await call("?q=%25%2C%28x%29&family=الأزرق&page=9");
    expect(search.run).toHaveBeenCalledWith(expect.anything(), { q: "x", family: "الأزرق", page: 1 });
  });
  it("can be cached for a minute", async () => {
    expect((await call("")).headers.get("cache-control")).toContain("s-maxage=60");
  });
  it("answers with an empty list when there is no database", async () => {
    search.db.value = null;
    expect(await (await call("?q=x")).json()).toEqual({ colours: [] });
    expect(search.run).not.toHaveBeenCalled();
  });
});
