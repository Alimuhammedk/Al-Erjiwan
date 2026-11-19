import { describe, expect, it } from "vitest";
import { priceForGovernorate } from "../admin/delivery";

describe("priceForGovernorate", () => {
  const rows = [
    { price: "4000", delivery_zones: { governorate_ar: "بغداد" } },
    { price: 6000, delivery_zones: [{ governorate_ar: "البصرة" }] },
    { price: 1, delivery_zones: null },
  ];
  it("finds the price for a governorate, whether the database sends the zone alone or in a list", () => {
    expect(priceForGovernorate(rows, "بغداد")).toBe(4000);
    expect(priceForGovernorate(rows, "البصرة")).toBe(6000);
  });
  it("is null when there is no price, no rows, or a zone is missing", () => {
    expect(priceForGovernorate(rows, "بابل")).toBeNull();
    expect(priceForGovernorate([], "بغداد")).toBeNull();
    expect(priceForGovernorate(null, "بغداد")).toBeNull();
    expect(priceForGovernorate(undefined, "بغداد")).toBeNull();
  });
  it("keeps a price of 0 (free) as 0, not as missing", () => {
    expect(priceForGovernorate([{ price: "0", delivery_zones: { governorate_ar: "بغداد" } }], "بغداد")).toBe(0);
  });
});

import { validateCompany, validateFees } from "../admin/delivery";
import { ar } from "@/content/ar";

const d = ar.admin.delivery;
const Z1 = "123e4567-e89b-12d3-a456-426614174001";
const Z2 = "123e4567-e89b-12d3-a456-426614174002";

describe("validateFees", () => {
  const raw = (o: Record<string, string>) => ({ ids: `${Z1},${Z2}`, ...o });
  it("reads a fee, a minimum and the on/off box for every governorate", () => {
    const r = validateFees(raw({ [`fee_${Z1}`]: "5000", [`min_${Z1}`]: "20000", [`active_${Z1}`]: "on", [`fee_${Z2}`]: "8,000", [`min_${Z2}`]: "" }));
    expect(r.ok && r.value).toEqual([
      { id: Z1, fee: 5000, min_order: 20000, is_active: true },
      { id: Z2, fee: 8000, min_order: 0, is_active: false },
    ]);
  });
  it("accepts Arabic digits and thousands separators, and a blank fee means free (0)", () => {
    const r = validateFees(raw({ [`fee_${Z1}`]: "٥٬٠٠٠", [`fee_${Z2}`]: "" }));
    expect(r.ok && r.value.map((z) => z.fee)).toEqual([5000, 0]);
  });
  it.each(["-1", "abc", "1.5", "5000 د", "١٢٣٤٥٦٧٨٩٠١٢٣٤"])("refuses %j and names the row", (bad) => {
    const r = validateFees(raw({ [`fee_${Z1}`]: bad, [`min_${Z2}`]: bad }));
    expect(r).toEqual({ ok: false, errors: { [`fee_${Z1}`]: d.invalidAmount, [`min_${Z2}`]: d.invalidAmount } });
  });
  it("ignores ids that are not real ids, and an empty list is refused", () => {
    expect(validateFees({ ids: "nope,../x" }).ok).toBe(false);
    expect(validateFees({}).ok).toBe(false);
    const r = validateFees({ ids: `nope,${Z1}`, [`fee_${Z1}`]: "1000" });
    expect(r.ok && r.value).toHaveLength(1);
  });
});

describe("validateCompany", () => {
  const ok = { name: " شركة السرعة ", whatsapp: "0780 123 4567", notes: " اتصل أولًا ", is_active: "on", ids: `${Z1},${Z2}` };
  it("cleans the name, the notes and the WhatsApp number, and keeps only the prices that were typed", () => {
    const r = validateCompany({ ...ok, [`price_${Z1}`]: "٤٬٠٠٠", [`price_${Z2}`]: "" });
    expect(r.ok && r.value).toEqual({
      name: "شركة السرعة",
      whatsapp: "07801234567",
      notes: "اتصل أولًا",
      is_active: true,
      prices: [{ zone_id: Z1, price: 4000 }],
    });
  });
  it("a price of 0 is kept (free), a blank price is not", () => {
    const r = validateCompany({ ...ok, [`price_${Z1}`]: "0", [`price_${Z2}`]: "  " });
    expect(r.ok && r.value.prices).toEqual([{ zone_id: Z1, price: 0 }]);
  });
  it.each(["+964 780 123 4567", "009647801234567", "٠٧٨٠١٢٣٤٥٦٧", "7801234567"])("reads %s as an Iraqi mobile", (n) => {
    const r = validateCompany({ ...ok, whatsapp: n });
    expect(r.ok && r.value.whatsapp).toBe("07801234567");
  });
  it("turns the box off and empty notes into nothing", () => {
    const r = validateCompany({ ...ok, is_active: undefined, notes: " " });
    expect(r.ok && r.value).toMatchObject({ is_active: false, notes: null });
  });
  it("reports each problem on its own field", () => {
    const r = validateCompany({ name: "ش", whatsapp: "123", ids: `${Z1}`, [`price_${Z1}`]: "-5" });
    expect(r).toEqual({ ok: false, errors: { name: d.errors.name, whatsapp: d.errors.whatsapp, [`price_${Z1}`]: d.invalidAmount } });
  });
  it("rejects over-long text", () => {
    const r = validateCompany({ ...ok, name: "ا".repeat(101), notes: "ا".repeat(1001) });
    expect(r.ok === false && Object.keys(r.errors).sort()).toEqual(["name", "notes"]);
  });
  it("treats missing values as empty, not as a crash", () => {
    expect(validateCompany({}).ok).toBe(false);
  });
});
