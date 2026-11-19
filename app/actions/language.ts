"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE, LANG_MAX_AGE, parseLang } from "@/lib/i18n/lang";

// Remembers the visitor's language for a year. Anything unknown means Arabic.
export async function setLanguageAction(lang: string): Promise<void> {
  (await cookies()).set(LANG_COOKIE, parseLang(lang), { maxAge: LANG_MAX_AGE, path: "/", sameSite: "lax" });
}
