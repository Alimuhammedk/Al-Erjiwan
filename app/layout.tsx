import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { ar } from "@/content/ar";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${ar.siteName} | ${ar.tagline}`,
  description: ar.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
