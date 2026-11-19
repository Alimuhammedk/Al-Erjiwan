import { describe, expect, it } from "vitest";
import { ar } from "@/content/ar";
import { prepareProductSave } from "../admin/product-save";

const e = ar.admin.errors;
const ID = "123e4567-e89b-12d3-a456-426614174000";
const C1 = "223e4567-e89b-12d3-a456-426614174001";
const IMG = "https://x.supabase.co/storage/v1/object/public/images/products/a.webp";

function form(fields: Record<string, string | string[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
}
const basics = { name_ar: "بنتلايت", is_active: "on" };
const sizes = (rows: object[]) => ({ has_sizes: "on", variants: JSON.stringify(rows) });
const row = (size_label: string, price: string, stock = "5", colour_id = "") => ({ size_label, price, stock, colour_id });

describe("prepareProductSave: a product without sizes", () => {
  it("uses the single price and stock", () => {
    const r = prepareProductSave(form({ ...basics, base_price: "٢٥٬٠٠٠", stock: "10", sale_price: "20000" }));
    expect(r.ok && r.value.product).toMatchObject({ base_price: 25000, stock: 10, sale_price: 20000 });
    expect(r.ok && r.value.variants).toEqual([]);
  });
  it("needs a price", () => {
    const r = prepareProductSave(form({ ...basics, stock: "1" }));
    expect(r.ok === false && r.errors.base_price).toBe(e.invalidPrice);
  });
  it("rejects a sale price that is not lower", () => {
    const r = prepareProductSave(form({ ...basics, base_price: "1000", sale_price: "1000" }));
    expect(r.ok === false && r.errors.sale_price).toBe(e.salePriceTooHigh);
  });
  it("ignores sizes that were posted while the sizes switch is off", () => {
    const r = prepareProductSave(form({ ...basics, base_price: "1000", variants: JSON.stringify([row("1 لتر", "500")]) }));
    expect(r.ok && r.value.variants).toEqual([]);
  });
});

describe("prepareProductSave: a product with sizes", () => {
  it("takes the lowest size price as the product price and adds up the stock", () => {
    const r = prepareProductSave(form({ ...basics, ...sizes([row("1 لتر", "18000", "20"), row("4 لتر", "60000", "15"), row("18 لتر", "220000", "0")]) }));
    expect(r.ok && r.value.product).toMatchObject({ base_price: 18000, stock: 35, sale_price: null });
    expect(r.ok && r.value.variants).toHaveLength(3);
  });
  it("needs no price field at all", () => {
    expect(prepareProductSave(form({ ...basics, ...sizes([row("1 لتر", "1000")]) })).ok).toBe(true);
  });
  it("discards a sale price, which only applies to products without sizes", () => {
    const r = prepareProductSave(form({ ...basics, sale_price: "500", ...sizes([row("1 لتر", "1000")]) }));
    expect(r.ok && r.value.product.sale_price).toBeNull();
  });
  it("needs at least one size", () => {
    const r = prepareProductSave(form({ ...basics, ...sizes([]) }));
    expect(r.ok === false && r.errors.variants).toBe(e.needSize);
  });
  it("reports an error on the exact row and field", () => {
    const r = prepareProductSave(form({ ...basics, ...sizes([row("1 لتر", "1000"), row("", "abc")]) }));
    expect(r.ok === false && r.errors["variants.1.size_label"]).toBe(e.required);
    expect(r.ok === false && r.errors["variants.1.price"]).toBe(e.invalidPrice);
    expect(r.ok === false && r.errors["variants.0.price"]).toBeUndefined();
  });
  it("keeps the id of an existing size and the colour of a ready-made one", () => {
    const r = prepareProductSave(form({ ...basics, ...sizes([{ ...row("4 لتر", "65000", "8", C1), id: ID }]) }));
    expect(r.ok && r.value.variants[0]).toMatchObject({ id: ID, colour_id: C1, price: 65000 });
  });
  it("treats a size without an id as new", () => {
    const r = prepareProductSave(form({ ...basics, ...sizes([row("1 لتر", "1000")]) }));
    expect(r.ok && r.value.variants[0].id).toBeNull();
  });
  it("rejects broken or non-list size data instead of crashing", () => {
    for (const variants of ["{not json", '{"a":1}', "null", '"text"']) {
      const r = prepareProductSave(form({ ...basics, has_sizes: "on", variants }));
      expect(r.ok, variants).toBe(false);
    }
  });
  it("caps the number of sizes", () => {
    const many = Array.from({ length: 31 }, (_, i) => row(`${i} لتر`, "1000"));
    expect(prepareProductSave(form({ ...basics, ...sizes(many) })).ok).toBe(false);
  });
});

describe("prepareProductSave: photos and id", () => {
  const base = { ...basics, base_price: "1000" };
  it("keeps photos in the given order", () => {
    const urls = [IMG, "/seed/p1.png"];
    const r = prepareProductSave(form({ ...base, images: JSON.stringify(urls) }));
    expect(r.ok && r.value.images).toEqual(urls);
  });
  it("accepts no photos", () => {
    const r = prepareProductSave(form(base));
    expect(r.ok && r.value.images).toEqual([]);
  });
  it("rejects a photo address that is not https or a site path", () => {
    for (const bad of ["javascript:alert(1)", "//evil.com/a.png", "http://x.com/a.png"]) {
      const r = prepareProductSave(form({ ...base, images: JSON.stringify([bad]) }));
      expect(r.ok === false && r.errors.images, bad).toBe(e.invalidImage);
    }
  });
  it("rejects more than 12 photos and broken photo data", () => {
    const r = prepareProductSave(form({ ...base, images: JSON.stringify(Array(13).fill(IMG)) }));
    expect(r.ok === false && r.errors.images).toBe(e.tooManyImages);
    expect(prepareProductSave(form({ ...base, images: "{bad" })).ok).toBe(false);
  });
  it("keeps a valid product id and drops a malformed one", () => {
    expect(prepareProductSave(form({ ...base, id: ID })).ok && (prepareProductSave(form({ ...base, id: ID })) as { value: { id: string } }).value.id).toBe(ID);
    const bad = prepareProductSave(form({ ...base, id: "nope" }));
    expect(bad.ok && bad.value.id).toBeNull();
  });
  it("still validates the basics: a name is required", () => {
    const r = prepareProductSave(form({ base_price: "1000", name_ar: " " }));
    expect(r.ok === false && r.errors.name_ar).toBe(e.required);
  });
});
