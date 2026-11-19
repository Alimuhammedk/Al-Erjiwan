import { beforeEach, describe, expect, it, vi } from "vitest";
import { ar } from "@/content/ar";
import { validateStoreInfo } from "../admin/store-info";
import { DEFAULT_STORE_SETTINGS, STORE_KEYS, STORE_MAX, parseStoreSettings } from "../store-settings";

describe("parseStoreSettings", () => {
  it("uses the built-in texts when nothing is saved", () => {
    expect(parseStoreSettings([])).toEqual(DEFAULT_STORE_SETTINGS);
    expect(parseStoreSettings(null)).toEqual(DEFAULT_STORE_SETTINGS);
    expect(DEFAULT_STORE_SETTINGS.guarantee).toBe(ar.home.shopInfo.defaultGuarantee);
    expect(DEFAULT_STORE_SETTINGS.hours).toBe("");
  });
  it("uses a saved text, trimmed, and keeps the built-in one for a blank row", () => {
    const r = parseStoreSettings([
      { key: STORE_KEYS.guarantee, value: "  ضماننا لك  " },
      { key: STORE_KEYS.address, value: "   " },
      { key: STORE_KEYS.hours, value: "يوميًا 9-9" },
    ]);
    expect(r).toEqual({ guarantee: "ضماننا لك", address: DEFAULT_STORE_SETTINGS.address, hours: "يوميًا 9-9" });
  });
  it("ignores unknown keys and caps over-long saved text", () => {
    const r = parseStoreSettings([{ key: "other", value: "x" }, { key: STORE_KEYS.hours, value: "ا".repeat(500) }]);
    expect(r.hours).toHaveLength(STORE_MAX.hours);
    expect(r.guarantee).toBe(DEFAULT_STORE_SETTINGS.guarantee);
  });
});

describe("validateStoreInfo", () => {
  it("accepts the three texts, trimmed, and empty ones", () => {
    const r = validateStoreInfo({ guarantee: "  نص  ", hours: "", address: "الكفل" });
    expect(r.ok && r.value).toEqual({ guarantee: "نص", hours: "", address: "الكفل" });
  });
  it("keeps line breaks in the guarantee", () => {
    const r = validateStoreInfo({ guarantee: "سطر 1\r\nسطر 2", hours: "", address: "" });
    expect(r.ok && r.value.guarantee).toBe("سطر 1\nسطر 2");
  });
  it("refuses over-long text and names the field", () => {
    const r = validateStoreInfo({ guarantee: "ا".repeat(601), hours: "ا".repeat(201), address: "ا".repeat(201) });
    expect(r).toEqual({ ok: false, errors: { guarantee: ar.admin.errors.tooLong, hours: ar.admin.errors.tooLong, address: ar.admin.errors.tooLong } });
  });
  it("treats missing values as empty, not as a crash", () => {
    expect(validateStoreInfo({}).ok).toBe(true);
  });
});

// ---- the action ----
const db = vi.hoisted(() => ({ upsert: vi.fn(), del: vi.fn() }));
const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/auth", () => guard);
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: async () => ({
    from: () => ({
      upsert: (v: unknown, o: unknown) => db.upsert(v, o),
      delete: () => ({ eq: (c: string, k: string) => db.del(c, k) }),
    }),
  }),
}));
import { saveStoreInfoAction } from "../../app/admin/(protected)/store/actions";

const form = (f: Record<string, string>) => {
  const d = new FormData();
  Object.entries(f).forEach(([k, v]) => d.set(k, v));
  return d;
};

describe("saveStoreInfoAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.requireAdmin.mockResolvedValue({ id: "admin" });
    db.upsert.mockResolvedValue({ error: null });
    db.del.mockResolvedValue({ error: null });
  });
  it("saves each text under its key and removes the blank ones", async () => {
    expect(await saveStoreInfoAction({}, form({ guarantee: "ضمان", hours: "", address: "بابل" }))).toEqual({});
    expect(db.upsert).toHaveBeenCalledWith({ key: STORE_KEYS.guarantee, value: "ضمان" }, { onConflict: "key" });
    expect(db.upsert).toHaveBeenCalledWith({ key: STORE_KEYS.address, value: "بابل" }, { onConflict: "key" });
    expect(db.del).toHaveBeenCalledWith("key", STORE_KEYS.hours);
  });
  it("writes nothing and names the field when a text is too long", async () => {
    const r = await saveStoreInfoAction({}, form({ guarantee: "ا".repeat(601), hours: "", address: "" }));
    expect(r.errors?.guarantee).toBe(ar.admin.errors.tooLong);
    expect(db.upsert).not.toHaveBeenCalled();
    expect(db.del).not.toHaveBeenCalled();
  });
  it("shows a save error, and refuses non-admins", async () => {
    db.upsert.mockResolvedValue({ error: { message: "x" } });
    expect((await saveStoreInfoAction({}, form({ guarantee: "ضمان" }))).error).toBe(ar.admin.errors.saveFailed);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveStoreInfoAction({}, form({}))).rejects.toThrow("REDIRECT:/admin/login");
  });
});
