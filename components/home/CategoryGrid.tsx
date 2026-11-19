import Image from "next/image";
import Link from "next/link";
import { ar } from "@/content/ar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import type { Category } from "@/types/db";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-12">
      <h2 className="mb-5 text-2xl font-extrabold text-brand-900">{ar.home.categoriesTitle}</h2>
      {categories.length === 0 ? (
        <EmptyState message={ar.home.emptyCategories} />
      ) : (
        // Wrapped and centred, so a short last row sits in the middle instead of leaving a gap.
        <FadeIn className="flex flex-wrap justify-center gap-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.id}`}
              className="group relative aspect-[4/3] w-[calc(50%-0.375rem)] overflow-hidden rounded-2xl bg-brand-50 shadow-sm transition-shadow hover:shadow-lg sm:w-[calc(33.333%-0.5rem)] lg:w-[calc(25%-0.5625rem)]"
            >
              {c.image_url && (
                <Image
                  src={c.image_url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-900/85 to-transparent p-3 pt-8">
                <h3 className="break-words font-bold text-white">{c.name_ar}</h3>
              </div>
            </Link>
          ))}
        </FadeIn>
      )}
    </section>
  );
}
