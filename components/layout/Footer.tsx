import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";
import { PAGE_SLUGS } from "@/lib/pages";
import { storeInfo } from "@/lib/store-info";

export async function Footer() {
  const t = await getMessages();
  return (
    <footer className="mt-16 bg-brand-900 text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
        <div>
          <p className="text-2xl font-extrabold">{t.siteName}</p>
          <p className="mt-1 text-white/80">{t.tagline}</p>
        </div>
        <ul className="space-y-2">
          <li>
            <span className="text-white/70">{t.common.phone}: </span>
            <a href={storeInfo.telHref} dir="ltr" className="font-semibold hover:text-sun-300">{storeInfo.phoneDisplay}</a>
          </li>
          <li>
            <span className="text-white/70">{t.common.instagram}: </span>
            <a href={storeInfo.instagramUrl} dir="ltr" className="font-semibold hover:text-sun-300">{storeInfo.instagram}</a>
          </li>
          <li>
            <span className="text-white/70">{t.common.address}: </span>
            <span className="font-semibold">{t.common.storeAddress}</span>
          </li>
        </ul>
        <nav aria-label={t.pages.footerTitle} className="md:col-span-2">
          <ul className="flex flex-wrap gap-x-6 gap-y-1 border-t border-white/10 pt-5">
            {PAGE_SLUGS.map((slug) => (
              <li key={slug}>
                <Link href={`/${slug}`} className="inline-flex min-h-11 items-center font-semibold text-white/90 hover:text-sun-300">
                  {t.pages[slug]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-sm text-white/70">
        © {t.siteName} · {t.common.rights}
      </p>
    </footer>
  );
}
