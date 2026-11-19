import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ rpc: vi.fn(), write: vi.fn(), del: vi.fn() }));
const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/auth", () => guard);
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: async () => ({
    rpc: db.rpc,
    from: () => ({
      insert: (v: unknown) => db.write("insert", v),
      update: (v: unknown) => ({ eq: (c: string, id: string) => db.write("update", v, c, id) }),
      delete: () => ({ eq: (c: string, id: string) => db.del(c, id) }),
    }),
  }),
}));

import { ar } from "@/content/ar";
import { deleteColourAction, importColoursAction, previewColourImportAction, saveColourAction } from "../../app/admin/(protected)/colours/actions";

const ID = "123e4567-e89b-12d3-a456-426614174000";
const t = ar.admin.colours;
const form = (f: Record<string, string | File>) => {
  const d = new FormData();
  Object.entries(f).forEach(([k, v]) => d.set(k, v));
  return d;
};
const csv = (text: string) => form({ file: new File([text], "colours.csv", { type: "text/csv" }) });
const HEAD = "system,code,name_ar,name_en,hex,family";

beforeEach(() => {
  vi.clearAllMocks();
  guard.requireAdmin.mockResolvedValue({ id: "admin" });
  db.write.mockResolvedValue({ error: null });
  db.del.mockResolvedValue({ error: null });
  db.rpc.mockResolvedValue({ data: { added: 1, updated: 0 }, error: null });
});

describe("saveColourAction", () => {
  const good = { name_ar: "أزرق", hex_text: "#112233", code: "B1" };
  it("creates a colour and goes back to the list", async () => {
    await expect(saveColourAction(null, {}, form(good))).rejects.toThrow("REDIRECT:/admin/colours");
    expect(db.write).toHaveBeenCalledWith("insert", { name_ar: "أزرق", name_en: null, system: null, code: "B1", hex: "#112233", family: null });
  });
  it("updates by id", async () => {
    await expect(saveColourAction(ID, {}, form(good))).rejects.toThrow("REDIRECT:");
    expect(db.write).toHaveBeenCalledWith("update", expect.objectContaining({ hex: "#112233" }), "id", ID);
  });
  it("returns field errors and writes nothing for bad input", async () => {
    const r = await saveColourAction(null, {}, form({ name_ar: "", hex_text: "x" }));
    expect(Object.keys(r.errors ?? {}).sort()).toEqual(["hex", "name_ar"]);
    expect(db.write).not.toHaveBeenCalled();
  });
  it("explains a repeated code on the code field, and hides other database text", async () => {
    db.write.mockResolvedValue({ error: { message: 'duplicate key value violates unique constraint "colours_system_code_key"' } });
    expect((await saveColourAction(null, {}, form(good))).errors?.code).toBe(t.codeTaken);
    db.write.mockResolvedValue({ error: { message: "boom" } });
    expect((await saveColourAction(null, {}, form(good))).error).toBe(ar.admin.errors.saveFailed);
  });
  it("refuses a malformed id and non-admins", async () => {
    expect((await saveColourAction("nope", {}, form(good))).error).toBe(ar.admin.errors.saveFailed);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(saveColourAction(null, {}, form(good))).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.write).not.toHaveBeenCalled();
  });
});

describe("deleteColourAction", () => {
  it("deletes and returns to the list", async () => {
    await expect(deleteColourAction(ID)).rejects.toThrow("REDIRECT:/admin/colours");
    expect(db.del).toHaveBeenCalledWith("id", ID);
  });
  it("refuses a bad id, reports a failure, and refuses non-admins", async () => {
    await expect(deleteColourAction("nope")).rejects.toThrow(ar.admin.errors.saveFailed);
    db.del.mockResolvedValue({ error: { message: "x" } });
    await expect(deleteColourAction(ID)).rejects.toThrow(ar.admin.errors.saveFailed);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(deleteColourAction(ID)).rejects.toThrow("REDIRECT:/admin/login");
  });
});

describe("previewColourImportAction", () => {
  it("counts good and bad rows, lists the problems and writes nothing", async () => {
    const r = await previewColourImportAction({}, csv(`${HEAD}\nJW,A1,جيد,,#112233,\nJW,A2,,,#112233,`));
    expect(r.info).toBe("صفوف صالحة: 1. صفوف فيها أخطاء: 1.");
    expect(r.issues).toEqual([t.lineError.replace("{line}", "3").replace("{message}", t.csvErrors.name)]);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("asks for a file, and refuses one that is too big", async () => {
    expect((await previewColourImportAction({}, form({}))).error).toBe(t.noFile);
    expect((await previewColourImportAction({}, form({ file: new File([""], "x.csv") }))).error).toBe(t.noFile);
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.csv");
    expect((await previewColourImportAction({}, form({ file: big }))).error).toBe(t.fileTooBig);
  });
  it("shows at most 20 problems and says there are more", async () => {
    const rows = Array.from({ length: 30 }, (_, i) => `JW,E${i},,,#112233,`).join("\n");
    const r = await previewColourImportAction({}, csv(`${HEAD}\n${rows}`));
    expect(r.issues).toHaveLength(21);
    expect(r.issues?.at(-1)).toBe(t.moreErrors);
  });
  it("refuses non-admins", async () => {
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(previewColourImportAction({}, csv(HEAD))).rejects.toThrow("REDIRECT:/admin/login");
  });
});

describe("importColoursAction", () => {
  it("sends the good rows to the database and reports the totals, listing skipped rows", async () => {
    db.rpc.mockResolvedValue({ data: { added: 1, updated: 1 }, error: null });
    const r = await importColoursAction({}, csv(`${HEAD}\nJW,A1,جيد,,#112233,\nJW,A2,جيد 2,,#445566,\nJW,A3,,,#112233,`));
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(db.rpc).toHaveBeenCalledWith("import_colours", { p_rows: [expect.objectContaining({ code: "A1" }), expect.objectContaining({ code: "A2" })] });
    expect(r.info).toBe("تمت الإضافة: 1. تم التحديث: 1.");
    expect(r.issues).toHaveLength(1);
  });
  it("sends large files in batches of 500", async () => {
    const rows = Array.from({ length: 1200 }, (_, i) => `JW,C${i},لون ${i},,#112233,`).join("\n");
    db.rpc.mockResolvedValue({ data: { added: 500, updated: 0 }, error: null });
    await importColoursAction({}, csv(`${HEAD}\n${rows}`));
    expect(db.rpc.mock.calls.map((c) => c[1].p_rows.length)).toEqual([500, 500, 200]);
  });
  it("says how many were saved when a later batch fails", async () => {
    const rows = Array.from({ length: 700 }, (_, i) => `JW,C${i},لون ${i},,#112233,`).join("\n");
    db.rpc.mockResolvedValueOnce({ data: { added: 500, updated: 0 }, error: null }).mockResolvedValueOnce({ data: null, error: { message: "x" } });
    const r = await importColoursAction({}, csv(`${HEAD}\n${rows}`));
    expect(r.error).toBe(t.importPartial.replace("{saved}", "500"));
  });
  it("refuses a file with no valid rows, without calling the database", async () => {
    const r = await importColoursAction({}, csv(`${HEAD}\nJW,A1,,,bad,`));
    expect(r.error).toBe(t.noValidRows);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("needs a file, and refuses non-admins", async () => {
    expect((await importColoursAction({}, form({}))).error).toBe(t.noFile);
    guard.requireAdmin.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(importColoursAction({}, csv(HEAD))).rejects.toThrow("REDIRECT:/admin/login");
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
