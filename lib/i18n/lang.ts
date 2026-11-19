export type Lang = "ar" | "en";
export const LANG_COOKIE = "lang";
export const LANG_MAX_AGE = 60 * 60 * 24 * 365; // remembered for a year

// Anything other than "en" is Arabic, the default language.
export const parseLang = (value: string | null | undefined): Lang => (value === "en" ? "en" : "ar");

export const dirOf = (lang: Lang): "rtl" | "ltr" => (lang === "en" ? "ltr" : "rtl");
export const otherLang = (lang: Lang): Lang => (lang === "en" ? "ar" : "en");

// Text for a language: the English when it is written (not blank), otherwise the Arabic.
export function localised(lang: Lang, arabic: string | null | undefined, english: string | null | undefined): string {
  if (lang === "en" && english && english.trim()) return english;
  return arabic ?? "";
}

// The locale used for dates and numbers: ordinary digits in both languages.
export const localeOf = (lang: Lang) => (lang === "en" ? "en-GB" : "ar-IQ-u-nu-latn");
