import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cairo } from "next/font/google";
import { ar } from "@/content/ar";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

// The site is designed in light colours only. This stops phone browsers from forcing their own dark mode on it.
export const viewport: Viewport = { colorScheme: "light" };

export const metadata: Metadata = {
  title: `${ar.siteName} | ${ar.tagline}`,
  description: ar.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-brand-900 focus:px-5 focus:py-3 focus:font-bold focus:text-white"
        >
          {ar.common.skip}
        </a>
        {children}
      </body>
    </html>
  );
}
