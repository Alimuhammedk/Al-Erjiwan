import { ar } from "@/content/ar";
import { getBrowserClient } from "@/lib/supabase/browser";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 1600;
const PUBLIC_PREFIX = "/storage/v1/object/public/images/";

export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// Returns an Arabic error message, or null when the file can be uploaded.
export function checkImageFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/")) return ar.admin.errors.invalidImage;
  if (file.size > MAX_UPLOAD_BYTES) return ar.admin.errors.imageTooBig;
  return null;
}

// Path inside the `images` bucket for one of our public URLs (used to delete replaced photos).
export function storagePathFromUrl(url: string): string | null {
  const i = url.indexOf(PUBLIC_PREFIX);
  return i === -1 ? null : url.slice(i + PUBLIC_PREFIX.length);
}

// Browser only: resize to at most 1600px and convert to WebP before upload.
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error(ar.admin.errors.invalidImage);
  return blob;
}

// A random file name. crypto.randomUUID only exists on secure pages (https or localhost), so it fails on a
// phone that opens the dev server over plain http; getRandomValues works everywhere.
export function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Browser only: only a signed-in admin can write to the bucket (storage security rules).
export async function uploadImage(file: File, folder: "products" | "categories" | "banners" | "articles"): Promise<string> {
  const blob = await compressImage(file);
  const path = `${folder}/${randomId()}.webp`;
  const storage = getBrowserClient().storage.from("images");
  const { error } = await storage.upload(path, blob, { contentType: "image/webp" });
  if (error) throw new Error(ar.admin.errors.saveFailed);
  return storage.getPublicUrl(path).data.publicUrl;
}
