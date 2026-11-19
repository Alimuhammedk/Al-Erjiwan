"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ar } from "@/content/ar";
import { hexToHsl, hslToHex } from "@/lib/colours/hex";

const t = ar.colours;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

type Props = {
  hex: string | null;
  // where the choice goes: the colour page address and the filters to keep
  basePath: string;
  keep: Record<string, string>;
};

// A hue wheel (angle = colour, distance from the centre = strength) and a lightness slider. It only finds a colour:
// the page then lists the closest catalogue shades. The choice is put in the address a moment after it stops changing.
export function ColourWheel({ hex, basePath, keep }: Props) {
  const router = useRouter();
  const start = (hex && hexToHsl(hex)) || { h: 0, s: 0, l: 50 };
  const [hue, setHue] = useState(start.h);
  const [sat, setSat] = useState(start.s);
  const [light, setLight] = useState(clamp(start.l, 15, 90));
  const [picked, setPicked] = useState(Boolean(hex));
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = hslToHex(hue, sat, light);

  function commit(h: number, s: number, l: number) {
    setPicked(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(keep);
      params.delete("c");
      params.delete("page");
      params.set("hex", hslToHex(h, s, l));
      router.replace(`${basePath}?${params.toString()}`, { scroll: false });
    }, 300);
  }
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  function fromPointer(e: PointerEvent<HTMLDivElement>) {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const h = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const s = clamp((Math.hypot(dx, dy) / (rect.width / 2)) * 100, 0, 100);
    const hh = Math.round((h + 360) % 360);
    const ss = Math.round(s);
    setHue(hh);
    setSat(ss);
    commit(hh, ss, light);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const big = e.shiftKey ? 4 : 1;
    let h = hue;
    let s = picked ? sat : 60; // a first key press starts from a clear colour, not from grey
    if (e.key === "ArrowRight") h = (hue + 5 * big) % 360;
    else if (e.key === "ArrowLeft") h = (hue - 5 * big + 360) % 360;
    else if (e.key === "ArrowUp") s = clamp(s + 5 * big, 0, 100);
    else if (e.key === "ArrowDown") s = clamp(s - 5 * big, 0, 100);
    else return;
    e.preventDefault();
    setHue(h);
    setSat(s);
    commit(h, s, light);
  }

  const rad = (hue * Math.PI) / 180;
  const marker = { left: `${50 + Math.sin(rad) * sat * 0.5}%`, top: `${50 - Math.cos(rad) * sat * 0.5}%` };

  return (
    <div className="space-y-3">
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-label={t.wheel}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={hue}
        aria-valuetext={current}
        data-testid="colour-wheel"
        data-hex={current}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => e.buttons > 0 && fromPointer(e)}
        onKeyDown={onKey}
        style={{
          background: `radial-gradient(circle closest-side, hsl(0 0% ${light}%) 0%, hsl(0 0% ${light}% / 0) 100%), conic-gradient(hsl(0 100% ${light}%), hsl(60 100% ${light}%), hsl(120 100% ${light}%), hsl(180 100% ${light}%), hsl(240 100% ${light}%), hsl(300 100% ${light}%), hsl(360 100% ${light}%))`,
          touchAction: "none",
        }}
        className="relative mx-auto aspect-square w-full max-w-64 cursor-crosshair rounded-full border border-ink/15 shadow-inner focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700"
      >
        {picked && (
          <span
            aria-hidden="true"
            style={{ ...marker, backgroundColor: current }}
            className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-md"
          />
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-brand-900">{t.lightness}</span>
        <input
          type="range"
          min={15}
          max={90}
          value={light}
          onChange={(e) => {
            const l = Number(e.target.value);
            setLight(l);
            commit(hue, sat, l);
          }}
          className="h-11 w-full accent-brand-700"
        />
      </label>
      <p className="text-sm text-ink/70">{t.wheelHelp}</p>
    </div>
  );
}
