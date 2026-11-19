import Image from "next/image";
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
        <FadeIn className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <div key={c.id} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand-50">
              {c.image_url && (
                <Image
                  src={c.image_url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-900/80 to-transparent p-3">
                <h3 className="break-words font-bold text-white">{c.name_ar}</h3>
              </div>
            </div>
          ))}
        </FadeIn>
      )}
    </section>
  );
}
