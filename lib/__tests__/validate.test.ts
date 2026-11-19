import { describe, expect, it } from "vitest";
import { ar } from "@/content/ar";
import {
  isImageUrl,
  parsePrice,
  validateBanner,
  validateCategory,
  validateProduct,
  validateVariant,
} from "../admin/validate";

const e = ar.admin.errors;
const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("parsePrice", () => {
  it.each([
    ["25000", 25000],
    ["25,000", 25000],
    ["٢٥٬٠٠٠", 25000],
    ["٢٥٠٠٠", 25000],
    [" 0 ", 0],
  ])("reads %s as %i", (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });
  it.each(["", "-5", "12.5", "abc", "1e6"])("rejects %j", (input) => {
    expect(parsePrice(input)).toBeNull();
  });
});

describe("validateProduct", () => {
  const base = { name_ar: "دهان أبيض", base_price: "25,000", stock: "10" };

  it("accepts a valid product and defaults the switches to false", () => {
    const r = validateProduct(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.base_price).toBe(25000);
      expect(r.value.stock).toBe(10);
      expect(r.value.is_active).toBe(false);
      expect(r.value.is_featured).toBe(false);
      expect(r.value.is_tintable).toBe(false);
      expect(r.value.sale_price).toBeNull();
    }
  });
  it("requires an Arabic name", () => {
    const r = validateProduct({ ...base, name_ar: "  " });
    expect(r).toEqual({ ok: false, errors: { name_ar: e.required } });
  });
  it("rejects a sale price that is not lower than the price", () => {
    const r = validateProduct({ ...base, sale_price: "25000" });
    expect(r.ok === false && r.errors.sale_price).toBe(e.salePriceTooHigh);
  });
  it("accepts a lower sale price", () => {
    const r = validateProduct({ ...base, sale_price: "20000" });
    expect(r.ok && r.value.sale_price).toBe(20000);
  });
  it("rejects a name over 200 characters", () => {
    const r = validateProduct({ ...base, name_ar: "ا".repeat(201) });
    expect(r.ok === false && r.errors.name_ar).toBe(e.tooLong);
  });
  it("rejects a negative stock", () => {
    const r = validateProduct({ ...base, stock: "-1" });
    expect(r.ok === false && r.errors.stock).toBe(e.invalidStock);
  });
  it("rejects a bad price", () => {
    const r = validateProduct({ ...base, base_price: "abc" });
    expect(r.ok === false && r.errors.base_price).toBe(e.invalidPrice);
  });
  it("rejects a category that is not a UUID", () => {
    const r = validateProduct({ ...base, category_id: "not-a-uuid" });
    expect(r.ok).toBe(false);
  });
  it("accepts a UUID category and an empty one", () => {
    expect(validateProduct({ ...base, category_id: UUID }).ok).toBe(true);
    const empty = validateProduct({ ...base, category_id: "" });
    expect(empty.ok && empty.value.category_id).toBeNull();
  });
});

describe("validateProduct no longer has room and finish", () => {
  it("leaves them out of what is saved, even if an old form sends them", () => {
    const r = validateProduct({ name_ar: "دهان", base_price: "1000", stock: "1", finish: "مطفي", rooms: ["المطبخ"] });
    expect(r.ok && r.value).not.toHaveProperty("finish");
    expect(r.ok && r.value).not.toHaveProperty("rooms");
  });
});

describe("validateVariant", () => {
  it("requires a size label and a valid price", () => {
    expect(validateVariant({ size_label: "", price: "5000", stock: "1" }).ok).toBe(false);
    expect(validateVariant({ size_label: "4 لتر", price: "x", stock: "1" }).ok).toBe(false);
  });
  it("accepts an empty colour as null", () => {
    const r = validateVariant({ size_label: "4 لتر", price: "5000", stock: "3", colour_id: "" });
    expect(r.ok && r.value).toEqual({ size_label: "4 لتر", price: 5000, stock: 3, colour_id: null });
  });
});

describe("validateCategory", () => {
  it("requires an Arabic name", () => {
    const r = validateCategory({ name_ar: "" });
    expect(r.ok === false && r.errors.name_ar).toBe(e.required);
  });
  it("accepts a valid category with a sort order", () => {
    const r = validateCategory({ name_ar: "دهانات داخلية", sort_order: "2" });
    expect(r.ok && r.value.sort_order).toBe(2);
  });
});

describe("isImageUrl", () => {
  it.each(["https://x.supabase.co/a.webp", "/seed/p1.png"])("accepts %s", (u) => {
    expect(isImageUrl(u)).toBe(true);
  });
  it.each(["//evil.com/a.png", "http://x.com/a.png", "javascript:alert(1)", "data:image/png;base64,AA", "", "seed/p1.png"])(
    "rejects %j",
    (u) => {
      expect(isImageUrl(u)).toBe(false);
    },
  );
  it("lets a category keep a site image path", () => {
    const r = validateCategory({ name_ar: "فئة", image_url: "/seed/c1.png" });
    expect(r.ok && r.value.image_url).toBe("/seed/c1.png");
  });
});

describe("validateBanner", () => {
  const image = { image_url: "https://x.supabase.co/storage/v1/object/public/images/banners/a.webp" };
  it.each(["", "/shop", "https://example.com/x"])("accepts link %j", (link) => {
    expect(validateBanner({ ...image, link }).ok).toBe(true);
  });
  it.each(["javascript:alert(1)", "//evil.com"])("rejects link %j", (link) => {
    const r = validateBanner({ ...image, link });
    expect(r.ok === false && r.errors.link).toBe(e.invalidLink);
  });
  it("requires an image", () => {
    const r = validateBanner({ image_url: "" });
    expect(r.ok === false && r.errors.image_url).toBe(e.required);
  });
});

describe("English boxes of a banner and a product", () => {
  const banner = { image_url: "https://x.supabase.co/storage/v1/object/public/images/banners/a.webp", title: "عروض", sort_order: "0" };
  it("a banner keeps its English title trimmed, and empty means nothing", () => {
    const r = validateBanner({ ...banner, title_en: " Winter offers " });
    expect(r.ok && r.value.title_en).toBe("Winter offers");
    const none = validateBanner({ ...banner, title_en: "  " });
    expect(none.ok && none.value.title_en).toBeNull();
  });
  it("a banner refuses an over-long English title", () => {
    expect(validateBanner({ ...banner, title_en: "a".repeat(201) })).toMatchObject({ ok: false, errors: { title_en: expect.any(String) } });
  });
  const product = { name_ar: "دهان", base_price: "1000", stock: "1" };
  it("a product keeps its English description, and empty means nothing", () => {
    const r = validateProduct({ ...product, description_en: " Great paint " });
    expect(r.ok && r.value.description_en).toBe("Great paint");
    const none = validateProduct(product);
    expect(none.ok && none.value.description_en).toBeNull();
  });
  it("a product refuses an over-long English description", () => {
    expect(validateProduct({ ...product, description_en: "a".repeat(5001) })).toMatchObject({ ok: false, errors: { description_en: expect.any(String) } });
  });
});
