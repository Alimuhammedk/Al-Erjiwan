"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLanguageAction } from "@/app/actions/language";
import { otherLang } from "@/lib/i18n/lang";
import { useLang } from "@/lib/i18n/provider";

// Switches the whole site to the other language. The page, the cart and what was typed in other tabs are kept.
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { lang, t } = useLang();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      lang={otherLang(lang)}
      aria-label={t.language.switchAria}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setLanguageAction(otherLang(lang));
          router.refresh();
        })
      }
      className={`inline-flex min-h-11 items-center rounded-full border-2 border-brand-100 px-4 text-sm font-bold text-brand-700 hover:border-brand-500 hover:bg-brand-50 disabled:opacity-60 ${className}`}
      data-testid="language-switch"
    >
      {t.language.switchLabel}
    </button>
  );
}
