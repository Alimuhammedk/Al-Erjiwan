import Link from "next/link";
import { ar } from "@/content/ar";
import { storeInfo } from "@/lib/store-info";

export function Footer() {
  return (
    <footer className="mt-16 bg-brand-900 text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
        <div>
          <p className="text-2xl font-extrabold">{ar.siteName}</p>
          <p className="mt-1 text-white/80">{ar.tagline}</p>
        </div>
        <ul className="space-y-2">
          <li>
            <span className="text-white/70">{ar.common.phone}: </span>
            <a href={storeInfo.telHref} dir="ltr" className="font-semibold hover:text-sun-300">{storeInfo.phoneDisplay}</a>
          </li>
          <li>
            <span className="text-white/70">{ar.common.instagram}: </span>
            <a href={storeInfo.instagramUrl} dir="ltr" className="font-semibold hover:text-sun-300">{storeInfo.instagram}</a>
          </li>
          <li>
            <Link href="/track" className="font-bold text-sun-300 hover:underline">{ar.common.trackOrder}</Link>
          </li>
          <li>
            <span className="text-white/70">{ar.common.address}: </span>
            <span className="font-semibold">{storeInfo.address}</span>
          </li>
        </ul>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-sm text-white/70">
        © {ar.siteName} · {ar.common.rights}
      </p>
    </footer>
  );
}
