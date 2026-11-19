import type { ReactNode } from "react";

// Fades its content up when it scrolls into view (CSS only, see .reveal in globals.css).
export function FadeIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`reveal ${className}`}>{children}</div>;
}
