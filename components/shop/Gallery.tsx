"use client";

import Image from "next/image";
import { useState } from "react";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return <div className="aspect-square rounded-2xl bg-brand-50" />;

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-brand-50">
        <Image
          src={images[active]}
          alt={alt}
          fill
          priority={active === 0}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto">
          {images.map((url, i) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${alt} ${i + 1}`}
                aria-current={i === active}
                className={`relative block size-16 overflow-hidden rounded-xl border-2 ${i === active ? "border-brand-700" : "border-transparent"}`}
              >
                <Image src={url} alt="" fill sizes="64px" loading="lazy" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
