import { describe, expect, it } from "vitest";
import { ar } from "@/content/ar";
import { afterEach, vi } from "vitest";
import { checkImageFile, fitWithin, randomId, storagePathFromUrl } from "../images";

afterEach(() => vi.unstubAllGlobals());

describe("randomId", () => {
  it("is 32 hex characters and different each time", () => {
    const a = randomId();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(randomId()).not.toBe(a);
  });
  it("works on a plain http page, where crypto.randomUUID does not exist (a phone on the local network)", () => {
    // Only getRandomValues, exactly what a browser offers outside https and localhost.
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37 + 11) % 256;
        return bytes;
      },
    });
    expect((globalThis.crypto as { randomUUID?: unknown }).randomUUID).toBeUndefined();
    expect(randomId()).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("storagePathFromUrl", () => {
  it("extracts the bucket path from a public URL", () => {
    expect(
      storagePathFromUrl("https://x.supabase.co/storage/v1/object/public/images/products/a.webp"),
    ).toBe("products/a.webp");
  });
  it("returns null for a URL from somewhere else", () => {
    expect(storagePathFromUrl("https://example.com/a.webp")).toBeNull();
  });
});

describe("fitWithin", () => {
  it("shrinks a wide image to the longest side", () => {
    expect(fitWithin(4000, 2000, 1600)).toEqual({ width: 1600, height: 800 });
  });
  it("never upscales a small image", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
  it("shrinks a tall image to the longest side", () => {
    expect(fitWithin(2000, 4000, 1600)).toEqual({ width: 800, height: 1600 });
  });
});

describe("checkImageFile", () => {
  it("rejects a non-image", () => {
    expect(checkImageFile({ type: "application/pdf", size: 1000 })).toBe(ar.admin.errors.invalidImage);
  });
  it("rejects an image over 10 MB", () => {
    expect(checkImageFile({ type: "image/png", size: 11 * 1024 * 1024 })).toBe(ar.admin.errors.imageTooBig);
  });
  it("accepts a normal photo", () => {
    expect(checkImageFile({ type: "image/jpeg", size: 2 * 1024 * 1024 })).toBeNull();
  });
});
