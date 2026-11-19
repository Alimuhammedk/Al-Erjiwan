"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { articleIn, cardExcerpt, type Article } from "@/lib/articles";
import { formatDate } from "@/lib/format";


function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ltr:-scale-x-100">
      <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

// "مقالات": one article card at a time, swiped or stepped sideways (the next card peeks in). Hides itself when
// there are no published articles.
export function ArticlesSection({ articles }: { articles: Article[] }) {
  const m = useMessages();
  const t = m.articles;
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  // How far one card moves, and which way is "forward" (left in a right to left page).
  const geometry = useCallback(() => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    return { el, step: first.offsetWidth + gap, sign: getComputedStyle(el).direction === "rtl" ? -1 : 1 };
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const g = geometry();
      if (!g) return;
      const i = Math.max(0, Math.min(articles.length - 1, index));
      g.el.scrollTo({ left: g.sign * g.step * i, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    },
    [articles.length, geometry],
  );

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const g = geometry();
      if (g) setActive(Math.max(0, Math.min(articles.length - 1, Math.round(Math.abs(el.scrollLeft) / g.step))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [articles.length, geometry]);

  if (articles.length === 0) return null;
  const arrow = "grid size-11 place-items-center rounded-full border-2 border-brand-100 bg-paper text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-50 disabled:opacity-30";

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-12" aria-labelledby="articles-title" data-testid="articles">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 id="articles-title" className="text-2xl font-extrabold text-brand-900">
            {t.title}
          </h2>
          <p className="mt-1 text-sm text-ink/70">{t.subtitle}</p>
        </div>
        {articles.length > 1 && (
          <div className="flex gap-2">
            <button type="button" className={arrow} onClick={() => goTo(active - 1)} disabled={active === 0} aria-label={t.previous}>
              <Chevron dir="right" />
            </button>
            <button type="button" className={arrow} onClick={() => goTo(active + 1)} disabled={active === articles.length - 1} aria-label={t.next}>
              <Chevron dir="left" />
            </button>
          </div>
        )}
      </div>

      <ul
        ref={track}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={t.title}
        tabIndex={-1}
      >
        {articles.map((a, n) => (
          <li key={a.id} className="w-[86%] shrink-0 snap-center sm:w-[62%] lg:w-[46%]" data-testid="article-card" aria-label={`${n + 1} / ${articles.length}`}>
            <Link
              href={`/articles/${a.id}`}
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-brand-100 bg-paper shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            >
              <span className="relative block aspect-[16/10] overflow-hidden bg-brand-50">
                <Image
                  src={a.cover_url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 46vw, (min-width: 640px) 62vw, 86vw"
                  className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-900/40 to-transparent" aria-hidden="true" />
                <time dateTime={a.published_at} className="absolute start-3 top-3 rounded-full bg-sun-300 px-3 py-1 text-xs font-extrabold text-brand-900">
                  {formatDate(a.published_at, m.lang)}
                </time>
              </span>
              <span className="flex flex-1 flex-col gap-2 p-5">
                <span className="line-clamp-2 text-xl font-extrabold leading-9 text-brand-900">{articleIn(a, m.lang).title}</span>
                <span className="line-clamp-3 leading-8 text-ink/75">{cardExcerpt(articleIn(a, m.lang))}</span>
                <span className="mt-auto inline-flex items-center gap-2 pt-2 font-bold text-brand-700">
                  {t.read}
                  <span aria-hidden="true" className="inline-block motion-safe:transition-transform ltr:rotate-180 motion-safe:group-hover:-translate-x-1 motion-safe:ltr:group-hover:translate-x-1">
                    ←
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {articles.length > 1 && (
        <div className="mt-3 flex justify-center gap-2" role="group" aria-label={t.title}>
          {articles.map((a, n) => (
            <button
              key={a.id}
              type="button"
              onClick={() => goTo(n)}
              aria-label={`${t.goTo} ${n + 1}`}
              aria-current={n === active ? "true" : undefined}
              className="grid size-6 place-items-center"
            >
              <span className={`block h-2 rounded-full transition-all ${n === active ? "w-6 bg-brand-700" : "w-2 bg-brand-100"}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
