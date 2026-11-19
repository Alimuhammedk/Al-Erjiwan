import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development only: lets a phone on the same Wi-Fi load the dev server's scripts (otherwise they are blocked).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  images: {
    // Product, category and banner photos are stored in Supabase Storage.
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
