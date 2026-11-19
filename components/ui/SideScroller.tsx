"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ar } from "@/content/ar";

// A row of items that slides sideways (swipe, trackpad, or the arrow buttons) instead of wrapping onto more lines.
// Items stay in one line and snap into place; the arrows only show when there is more to see in that direction.
// `itemClassName` sets each item's width, so the row decides how many fit.
export function SideScroller({ children, label, itemClassName }: { children: ReactNode; label: string; itemClassName: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [can, setCan] = useState({ back: false, forward: false });
  const items = Children.toArray(children);

  // Which way is "forward" (left on a right-to-left page), and how far one item moves.
  const geometry = useCallback(() => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    return { el, step: first.offsetWidth + gap, sign: getComputedStyle(el).direction === "rtl" ? -1 : 1 };
  }, []);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const moved = Math.abs(el.scrollLeft);
    setCan({ back: moved > 4, forward: moved + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      resize.disconnect();
    };
  }, [measure, items.length]);

  function move(by: 1 | -1) {
    const g = geometry();
    if (!g) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    g.el.scrollBy({ left: g.sign * g.step * by, behavior: reduce ? "auto" : "smooth" });
  }

  const arrow =
    "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border-2 border-brand-100 bg-paper/95 text-brand-700 shadow-md backdrop-blur transition-colors hover:border-brand-500 hover:bg-brand-50 sm:grid";
  const icon = (d: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );

  return (
    <div className="relative" data-testid="side-scroller">
      <ul
        ref={track}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, n) => (
          <li key={n} className={`shrink-0 snap-start ${itemClassName}`}>
            {item}
          </li>
        ))}
      </ul>
      {can.back && (
        <button type="button" onClick={() => move(-1)} aria-label={ar.common.slideBack} className={`${arrow} start-1`}>
          {icon("M9 6l6 6-6 6")}
        </button>
      )}
      {can.forward && (
        <button type="button" onClick={() => move(1)} aria-label={ar.common.slideForward} className={`${arrow} end-1`}>
          {icon("M15 6l-6 6 6 6")}
        </button>
      )}
    </div>
  );
}
