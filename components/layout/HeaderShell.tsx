"use client";

import { useEffect, useState, type ReactNode } from "react";

// The sticky header gains a soft shadow once the page is scrolled.
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className="sticky top-0 z-40 border-b border-brand-100 bg-paper/95 backdrop-blur transition-shadow duration-300 data-[scrolled=true]:shadow-md"
    >
      {children}
    </header>
  );
}
