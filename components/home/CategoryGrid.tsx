import { localised } from "@/lib/i18n/lang";
import Image from "next/image";
import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { SideScroller } from "@/components/ui/SideScroller";
import type { Category } from "@/types/db";

export async function CategoryGrid({ categories }: { categories: Category[] }) {
  const m = await getMessages();
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-12">
      <h2 className="mb-5 text-2xl font-extrabold text-brand-900">{m.home.categoriesTitle}</h2>
      {categories.length === 0 ? (
        <EmptyState message={m.home.emptyCategories} />
      ) : (
        // One line that slides sideways; the cards never wrap or sit on top of each other.
        <FadeIn>
          <SideScroller label={m.home.categoriesTitle} itemClassName="w-[44%] sm:w-[30%] lg:w-[23.2%]">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/shop?category=${c.id}`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-brand-50 shadow-sm transition-shadow hover:shadow-lg"
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
                  <h3 className="break-words font-bold text-white">{localised(m.lang, c.name_ar, c.name_en)}</h3>
                </div>
              </Link>
            ))}
          </SideScroller>
        </FadeIn>
      )}
    </section>
  );
}
