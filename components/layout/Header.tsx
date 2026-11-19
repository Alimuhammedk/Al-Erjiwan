import Image from "next/image";
import Link from "next/link";
import { ar } from "@/content/ar";
import { CartLink } from "@/components/shop/CartLink";
import { HeaderShell } from "./HeaderShell";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import { SearchForm } from "./SearchForm";

export function Header() {
  const links = ar.nav.filter((l) => l.enabled);

  return (
    <HeaderShell>
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3" aria-label={ar.siteName}>
          <Image src="/logo-icon.jpg" alt="" width={48} height={43} priority className="h-10 w-auto" />
          <span className="text-xl font-extrabold text-brand-900">{ar.siteName}</span>
        </Link>
        <NavLinks links={links} />
        <div className="flex items-center gap-2">
          <SearchForm className="hidden w-60 lg:block" />
          <CartLink />
          <MobileMenu links={links} />
        </div>
      </div>
    </HeaderShell>
  );
}
