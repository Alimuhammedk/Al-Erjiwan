"use client";

import { localised } from "@/lib/i18n/lang";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import type { Banner } from "@/types/db";

// The button is a 44px tap area; only the small circle inside it is drawn (32px on phones).
function Arrow({ dir, label, onClick, side }: { dir: "left" | "right"; label: string; onClick: () => void; side: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center ${side}`}
    >
      <span className="grid size-8 place-items-center rounded-full bg-white/80 text-brand-900 shadow transition-colors group-hover:bg-white group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-white md:size-10">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ltr:-scale-x-100">
          <path d={dir === "right" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
        </svg>
      </span>
    </button>
  );
}

export function HeroSlider({ banners }: { banners: Banner[] }) {
  const m = useMessages();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [playing, setPlaying] = useState(true);
  const count = banners.length;
  const active = count > 0 ? index % count : 0;
  // Auto-rotation stops while hovered or paused, and never runs for people who asked for less motion.
  const rotating = count > 1 && playing && !hovering && !reduceMotion;

  useEffect(() => {
    if (!rotating) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [rotating, count]);

  // Brand text, not a banner: shown until the owner adds banners in admin.
  if (count === 0) {
    return (
      <section className="grid min-h-64 place-items-center bg-gradient-to-br from-brand-900 via-brand-700 to-magenta-500 px-4 py-16 text-center text-white md:min-h-96">
        <div className="space-y-5">
          <h1 className="text-4xl font-extrabold md:text-6xl">{m.siteName}</h1>
          <p className="text-lg text-white/90 md:text-2xl">{m.tagline}</p>
          <Link href="/shop" className="inline-block rounded-full bg-sun-300 px-8 py-3 text-lg font-extrabold text-brand-900 transition-transform hover:scale-105">
            {m.hero.shopNow}
          </Link>
        </div>
      </section>
    );
  }

  const banner = banners[active];
  const slide = (
    <>
      <Image src={banner.image_url} alt={localised(m.lang, banner.title, banner.title_en) || m.siteName} fill priority={active === 0} sizes="100vw" className="object-cover" />
      {/* Wide side padding keeps the text clear of the arrows; bottom padding keeps it clear of the dots. */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 bg-gradient-to-t from-brand-900/85 to-transparent px-12 pb-12 pt-10 md:flex-row md:items-end md:justify-between md:gap-4 md:px-16 md:pb-14">
        {localised(m.lang, banner.title, banner.title_en) && (
          <h2 className="line-clamp-2 text-lg font-extrabold leading-snug text-white md:text-4xl">{localised(m.lang, banner.title, banner.title_en)}</h2>
        )}
        {banner.link && (
          <span className="shrink-0 rounded-full bg-sun-300 px-4 py-1.5 text-sm font-extrabold text-brand-900 md:px-6 md:py-2.5 md:text-base">
            {m.hero.shopNow}
          </span>
        )}
      </div>
    </>
  );

  return (
    <section
      className="relative aspect-[4/3] max-h-[32rem] w-full overflow-hidden bg-brand-50 md:aspect-[21/9]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <h1 className="sr-only">{m.siteName}</h1>
      {/* initial={false}: the first banner is in the page at once, only later changes animate */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={banner.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.5 }}
        >
          {banner.link ? (
            <Link href={banner.link} className="absolute inset-0 block">
              {slide}
            </Link>
          ) : (
            slide
          )}
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <>
          <Arrow dir="right" label={m.hero.prev} side="start-1 md:start-3" onClick={() => setIndex((i) => (i - 1 + count) % count)} />
          <Arrow dir="left" label={m.hero.next} side="end-1 md:end-3" onClick={() => setIndex((i) => (i + 1) % count)} />
          <div className="absolute inset-x-0 bottom-1 flex items-center justify-center">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`${m.common.slide} ${i + 1}`}
                aria-current={i === active}
                onClick={() => setIndex(i)}
                className="grid size-11 place-items-center"
              >
                <span className={`block h-2.5 rounded-full transition-all ${i === active ? "w-7 bg-white" : "w-2.5 bg-white/55"}`} />
              </button>
            ))}
          </div>
          {/* Hidden from view, but a keyboard user can Tab to it: it appears while focused (WCAG: moving content needs a pause control). */}
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? m.hero.pause : m.hero.play}
            aria-pressed={!playing}
            className="sr-only focus:not-sr-only focus:absolute focus:bottom-14 focus:end-3 focus:z-10 focus:grid focus:size-11 focus:place-items-center focus:rounded-full focus:bg-white focus:text-brand-900 focus:shadow"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
            </svg>
          </button>
        </>
      )}
    </section>
  );
}
