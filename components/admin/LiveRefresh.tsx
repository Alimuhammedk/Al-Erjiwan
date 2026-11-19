"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const EVERY_MS = 30_000;

// Keeps the admin up to date: refreshes the page every 30 seconds while it is on screen, and shows the number of
// new orders in the browser tab's title. (Polling is enough for a shop's order volume.)
export function LiveRefresh({ newOrders }: { newOrders: number }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && router.refresh();
    const id = setInterval(tick, EVERY_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s/, "");
    document.title = newOrders > 0 ? `(${newOrders}) ${base}` : base;
  }, [newOrders, pathname]);

  return null;
}
