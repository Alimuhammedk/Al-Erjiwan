import { describe, expect, it } from "vitest";
import { validateFees } from "../admin/delivery";
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
