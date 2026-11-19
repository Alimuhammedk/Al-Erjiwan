import type { ReactNode } from "react";

// The admin is always Arabic and right-to-left, whichever language the visitor chose for the shop.
export default function AdminRoot({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" lang="ar" className="flex flex-1 flex-col">
      {children}
    </div>
  );
}
