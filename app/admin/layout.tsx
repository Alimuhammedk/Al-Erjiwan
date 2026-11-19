import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Admin pages are never cached: they always reflect the signed-in session.
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col bg-brand-50 outline-none">
      {children}
    </div>
  );
}
