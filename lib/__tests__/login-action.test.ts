import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/auth-server", () => ({ createAuthClient: async () => client }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { ar } from "@/content/ar";
import { signInAction } from "../../app/admin/login/actions";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => f.set(k, v));
  return f;
};
const prev = { error: null };

beforeEach(() => {
  vi.resetAllMocks();
  client.auth.signOut.mockResolvedValue({ error: null });
});

describe("signInAction", () => {
  it("rejects an empty email without calling Supabase", async () => {
    const r = await signInAction(prev, form({ email: "  ", password: "x" }));
    expect(r).toEqual({ error: ar.admin.badCredentials });
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects an empty password without calling Supabase", async () => {
    const r = await signInAction(prev, form({ email: "a@b.com", password: "" }));
    expect(r).toEqual({ error: ar.admin.badCredentials });
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects a 1,000 character password without calling Supabase", async () => {
    const r = await signInAction(prev, form({ email: "a@b.com", password: "x".repeat(1000) }));
    expect(r).toEqual({ error: ar.admin.badCredentials });
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns the Arabic bad-credentials error when Supabase refuses", async () => {
    client.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: "Invalid login" } });
    const r = await signInAction(prev, form({ email: "a@b.com", password: "wrong" }));
    expect(r).toEqual({ error: ar.admin.badCredentials });
  });

  it("signs out and says forbidden when the account is not an admin", async () => {
    client.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "u" } }, error: null });
    client.rpc.mockResolvedValue({ data: false, error: null });
    const r = await signInAction(prev, form({ email: "a@b.com", password: "pw" }));
    expect(r).toEqual({ error: ar.admin.forbidden });
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("goes to /admin for an admin and ignores a next address in the form", async () => {
    client.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "u" } }, error: null });
    client.rpc.mockResolvedValue({ data: true, error: null });
    await expect(
      signInAction(prev, form({ email: "a@b.com", password: "pw", next: "https://evil.example" })),
    ).rejects.toThrow("REDIRECT:/admin");
  });
});
