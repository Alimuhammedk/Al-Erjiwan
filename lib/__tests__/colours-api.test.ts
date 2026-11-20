import { beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.hoisted(() => ({ run: vi.fn(), families: vi.fn(), scope: vi.fn(), db: { value: {} as object | null } }));
vi.mock("@/lib/colours/search", () => ({ runColourSearch: search.run, listColourFamilies: search.families, productColourScope: search.scope }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: () => search.db.value }));

import { GET } from "../../app/api/colours/route";

const P = "123e4567-e89b-12d3-a456-426614174000";
const call = (qs: string) => GET(new Request(`http://localhost/api/colours${qs}`));

beforeEach(() => {
  vi.clearAllMocks();
  search.db.value = {};
  search.scope.mockResolvedValue("all");
  search.families.mockResolvedValue(["الأزرق"]);
  search.run.mockResolvedValue({ colours: [{ id: "1", name_ar: "أزرق", name_en: "Blue", code: "B1", hex: "#0000ff", family: "الأزرق", system: "JW" }], total: 1 });
});

describe("GET /api/colours", () => {
  it("returns the shades with only the fields the panel needs, and the families", async () => {
    const res = await call(`?product=${P}&q=أزرق`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      colours: [{ id: "1", name_ar: "أزرق", name_en: "Blue", code: "B1", hex: "#0000ff", family: "الأزرق", system: "JW" }],
      families: ["الأزرق"],
    });
  });
  it("for a product that offers every colour, searches the whole catalogue", async () => {
    await call(`?product=${P}`);
    expect(search.run).toHaveBeenCalledWith(expect.anything(), { q: "", family: null, page: 1 }, 60, undefined);
    expect(search.families).toHaveBeenCalledWith(expect.anything(), undefined);
  });
  it("for a product with a chosen list, searches only that product's colours", async () => {
    search.scope.mockResolvedValue("list");
    await call(`?product=${P}`);
    expect(search.run).toHaveBeenCalledWith(expect.anything(), expect.anything(), 60, P);
    expect(search.families).toHaveBeenCalledWith(expect.anything(), P);
  });
  it("cleans the search before it reaches the database, and always asks for page 1", async () => {
    await call(`?product=${P}&q=%25%2C%28x%29&family=الأزرق&page=9`);
    expect(search.run).toHaveBeenCalledWith(expect.anything(), { q: "x", family: "الأزرق", page: 1 }, 60, undefined);
  });
  it("answers with nothing for a missing or malformed product, a product that offers nothing, or no database", async () => {
    for (const qs of ["", "?product=nope"]) expect(await (await call(qs)).json()).toEqual({ colours: [], families: [] });
    search.scope.mockResolvedValue("none");
    expect(await (await call(`?product=${P}`)).json()).toEqual({ colours: [], families: [] });
    search.db.value = null;
    expect(await (await call(`?product=${P}`)).json()).toEqual({ colours: [], families: [] });
    expect(search.run).not.toHaveBeenCalled();
  });
  it("can be cached for a minute", async () => {
    expect((await call(`?product=${P}`)).headers.get("cache-control")).toContain("s-maxage=60");
  });
});
