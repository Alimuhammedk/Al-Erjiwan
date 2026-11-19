"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ar } from "@/content/ar";
import type { Banner } from "@/types/db";

export function HeroSlider({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [count, paused]);

  // Brand text, not a banner: shown until the owner adds banners in admin.
  if (count === 0) {
    return (
      <section className="grid min-h-64 place-items-center bg-gradient-to-br from-brand-900 via-brand-700 to-magenta-500 px-4 py-16 text-center text-white md:min-h-96">
        <div>
          <h1 className="text-4xl font-extrabold md:text-6xl">{ar.siteName}</h1>
          <p className="mt-3 text-lg text-white/90 md:text-2xl">{ar.tagline}</p>
        </div>
      </section>
    );
  }

  const banner = banners[index % count];
  const slide = (
    <>
      <Image src={banner.image_url} alt={banner.title ?? ar.siteName} fill priority={index === 0} sizes="100vw" className="object-cover" />
      {banner.title && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-900/80 to-transparent p-6 pb-10">
          <h2 className="text-2xl font-extrabold text-white md:text-4xl">{banner.title}</h2>
        </div>
      )}
    </>
  );

  return (
    <section
      className="relative aspect-[16/9] max-h-[32rem] w-full overflow-hidden bg-brand-50 md:aspect-[21/9]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
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
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`${ar.common.slide} ${i + 1}`}
              aria-current={i === index % count}
              onClick={() => setIndex(i)}
              className={`size-2.5 rounded-full ${i === index % count ? "bg-white" : "bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
