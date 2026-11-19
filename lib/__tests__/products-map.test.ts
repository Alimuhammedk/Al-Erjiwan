import { describe, expect, it } from "vitest";
import { withFirstImage } from "../data/products";
import type { Product } from "@/types/db";

const product = { id: "p1", name_ar: "دهان" } as Product;

describe("withFirstImage", () => {
  it("takes the first two photos in order", () => {
    const r = withFirstImage({
      ...product,
      product_images: [
        { url: "/b.png", sort_order: 1 },
        { url: "/a.png", sort_order: 0 },
        { url: "/c.png", sort_order: 2 },
      ],
    });
    expect(r.image_url).toBe("/a.png");
    expect(r.hover_image_url).toBe("/b.png");
  });
  it("has no hover photo when there is only one", () => {
    const r = withFirstImage({ ...product, product_images: [{ url: "/a.png", sort_order: 0 }] });
    expect(r.image_url).toBe("/a.png");
    expect(r.hover_image_url).toBeNull();
  });
  it("has no photos when there are none", () => {
    expect(withFirstImage({ ...product, product_images: null })).toMatchObject({ image_url: null, hover_image_url: null });
  });
  it("does not leak the raw photo list", () => {
    expect(withFirstImage({ ...product, product_images: [] })).not.toHaveProperty("product_images");
  });
});
