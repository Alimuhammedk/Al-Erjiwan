import Image from "next/image";
import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";
import { CartLink } from "@/components/shop/CartLink";
import { HeaderShell } from "./HeaderShell";
import { LanguageSwitch } from "./LanguageSwitch";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import { SearchForm } from "./SearchForm";

export async function Header() {
  const t = await getMessages();
  const links = t.nav.filter((l) => l.enabled);

  return (
    <HeaderShell>
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3" aria-label={t.siteName}>
          <Image src="/logo-icon.png" alt="" width={44} height={40} priority className="h-10 w-auto" />
          <span className="text-xl font-extrabold text-brand-900">{t.siteName}</span>
        </Link>
        <NavLinks links={links} />
        <div className="flex items-center gap-2">
          <SearchForm className="hidden w-60 lg:block" searchSite={t.common.searchSite} search={t.common.search} />
          <LanguageSwitch className="hidden md:inline-flex" />
          <CartLink />
          <MobileMenu links={links} />
        </div>
      </div>
    </HeaderShell>
  );
}
