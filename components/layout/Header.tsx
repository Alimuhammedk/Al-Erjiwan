import Image from "next/image";
import Link from "next/link";
import { ar } from "@/content/ar";
import { CartLink } from "@/components/shop/CartLink";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  const links = ar.nav.filter((l) => l.enabled);

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-paper/95 backdrop-blur">
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3" aria-label={ar.siteName}>
          <Image src="/logo-icon.jpg" alt="" width={48} height={43} priority className="h-10 w-auto" />
          <span className="text-xl font-extrabold text-brand-900">{ar.siteName}</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label={ar.common.menu}>
          {links.map((l) => (
            <Link key={l.key} href={l.href} className="font-semibold text-brand-900 hover:text-coral-500">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <CartLink />
          <MobileMenu links={links} />
        </div>
      </div>
    </header>
  );
}
