import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cairo } from "next/font/google";
import { SelectOnFocus } from "@/components/SelectOnFocus";
import { dirOf } from "@/lib/i18n/lang";
import { getLang, messagesFor } from "@/lib/i18n/messages";
import { LangProvider } from "@/lib/i18n/provider";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

// The site is designed in light colours only. This stops phone browsers from forcing their own dark mode on it.
export const viewport: Viewport = { colorScheme: "light" };

export async function generateMetadata(): Promise<Metadata> {
  const t = messagesFor(await getLang());
  return { title: `${t.siteName} | ${t.tagline}`, description: t.tagline };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();
  const t = messagesFor(lang);
  return (
    <html lang={lang} dir={dirOf(lang)} className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LangProvider lang={lang} messages={t}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-brand-900 focus:px-5 focus:py-3 focus:font-bold focus:text-white"
          >
            {t.common.skip}
          </a>
          <SelectOnFocus />
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
