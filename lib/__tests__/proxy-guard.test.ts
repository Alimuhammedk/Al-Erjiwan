import { describe, expect, it } from "vitest";
import { shouldRedirectToLogin } from "../supabase/proxy";

describe("shouldRedirectToLogin", () => {
  it("sends logged-out visitors from /admin to login", () => {
    expect(shouldRedirectToLogin("/admin", false)).toBe(true);
  });
  it("sends logged-out visitors from deeper admin pages to login", () => {
    expect(shouldRedirectToLogin("/admin/products", false)).toBe(true);
  });
  it("keeps the login page reachable when logged out", () => {
    expect(shouldRedirectToLogin("/admin/login", false)).toBe(false);
  });
  it("lets logged-in visitors through", () => {
    expect(shouldRedirectToLogin("/admin", true)).toBe(false);
    expect(shouldRedirectToLogin("/admin/login", true)).toBe(false);
  });
});
