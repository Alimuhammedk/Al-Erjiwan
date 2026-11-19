import { cookies } from "next/headers";
import { ar } from "@/content/ar";
import { en } from "@/content/en";
import { LANG_COOKIE, parseLang, type Lang } from "./lang";
import type { Messages } from "./types";

const { admin: _admin, ...arabic } = ar;
void _admin;

// The words for a language. The admin part of the Arabic file is left out: customers never see it.
export function messagesFor(lang: Lang): Messages {
  return lang === "en" ? en : arabic;
}

// The language the visitor chose (Arabic when they have not chosen), read on the server for each page.
export async function getLang(): Promise<Lang> {
  try {
    return parseLang((await cookies()).get(LANG_COOKIE)?.value);
  } catch {
    return "ar";
  }
}

export async function getMessages(): Promise<Messages> {
  return messagesFor(await getLang());
}
