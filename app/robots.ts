import type { MetadataRoute } from "next";
import { BLOCKED_PATHS, absoluteUrl } from "@/lib/seo";

// Search engines may read the public shop, but not the admin, cart, checkout, order or tracking pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: BLOCKED_PATHS.map((p) => `${p}`) }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
