import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateTag } from "next/cache";

const db = vi.hoisted(() => {
  const eq = vi.fn();
  const table = { insert: vi.fn(), update: vi.fn(() => ({ eq })), delete: vi.fn(() => ({ eq })) };
  return { eq, table, from: vi.fn(() => table) };
});
vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: "admin" }) }));
vi.mock("@/lib/supabase/auth-server", () => ({ createAuthClient: async () => ({ from: db.from }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));

import { deleteBannerAction, saveBannerAction } from "../../app/admin/(protected)/banners/actions";
import { createServerClient } from "../supabase/server";

const banner = new FormData();
banner.set("image_url", "https://x.supabase.co/storage/v1/object/public/images/banners/a.webp");

beforeEach(() => {
  vi.clearAllMocks();
  db.table.insert.mockResolvedValue({ error: null });
  db.eq.mockResolvedValue({ error: null });
});

describe("the shop's saved reads are cleared after the owner changes something", () => {
  it("clears them after a good save and a delete", async () => {
    await expect(saveBannerAction(null, {}, banner)).rejects.toThrow("REDIRECT");
    expect(updateTag).toHaveBeenCalledWith("catalog");
    vi.clearAllMocks();
    await expect(deleteBannerAction("b1")).rejects.toThrow("REDIRECT");
    expect(updateTag).toHaveBeenCalledWith("catalog");
  });
  it("does not clear them when the save is refused or fails", async () => {
    await saveBannerAction(null, {}, new FormData());
    db.table.insert.mockResolvedValue({ error: { message: "x" } });
    expect((await saveBannerAction(null, {}, banner)).error).toBeTruthy();
    db.eq.mockResolvedValue({ error: { message: "x" } });
    await expect(deleteBannerAction("b1")).rejects.toThrow(/^(?!REDIRECT)/);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("createServerClient", () => {
  it("reads through the cache only when asked", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "k";
    const seen: RequestInit[] = [];
    vi.stubGlobal("fetch", async (_u: unknown, init: RequestInit) => { seen.push(init); return new Response("[]"); });
    await createServerClient({ cached: true })!.from("banners").select("*");
    await createServerClient()!.from("banners").select("*");
    expect((seen[0] as { next?: unknown }).next).toEqual({ revalidate: 60, tags: ["catalog"] });
    expect((seen[1] as { next?: unknown }).next).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
