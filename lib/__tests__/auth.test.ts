import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  auth: { getUser: vi.fn(), signOut: vi.fn() },
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/auth-server", () => ({ createAuthClient: async () => client }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { requireAdmin } from "../auth";

const user = { id: "u1", email: "admin@example.com" };

beforeEach(() => {
  vi.resetAllMocks();
  client.auth.signOut.mockResolvedValue({ error: null });
});

describe("requireAdmin", () => {
  it("redirects to login when there is no session", async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login");
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("redirects to login when the session is invalid", async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "bad jwt" } });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("signs out and redirects a logged-in account that is not an admin", async () => {
    client.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    client.rpc.mockResolvedValue({ data: false, error: null });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login?error=forbidden");
    expect(client.rpc).toHaveBeenCalledWith("is_admin");
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("treats a failing is_admin call as not an admin", async () => {
    client.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    client.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login?error=forbidden");
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("returns the user for an admin", async () => {
    client.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    client.rpc.mockResolvedValue({ data: true, error: null });
    await expect(requireAdmin()).resolves.toEqual(user);
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });
});
