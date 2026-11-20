import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({ value: undefined as string | undefined, set: vi.fn(), throwing: false }));
vi.mock("next/headers", () => ({
  cookies: async () => {
    if (jar.throwing) throw new Error("outside a request");
    return { get: () => (jar.value === undefined ? undefined : { value: jar.value }), set: jar.set };
  },
}));

import { setLanguageAction } from "../../app/actions/language";
import { formatDate, formatDateTime, formatPrice } from "../format";
import { LANG_COOKIE, LANG_MAX_AGE, dirOf, localeOf, localised, otherLang, parseLang } from "../i18n/lang";
import { getLang, getMessages, messagesFor } from "../i18n/messages";

beforeEach(() => {
  jar.value = undefined;
  jar.throwing = false;
  jar.set.mockClear();
});

describe("parseLang, dirOf, otherLang", () => {
  it.each([[undefined, "ar"], [null, "ar"], ["", "ar"], ["ar", "ar"], ["en", "en"], ["EN", "ar"], ["fr", "ar"], ["en ", "ar"], ["x".repeat(500), "ar"]])("reads %j as %s", (v, out) => {
    expect(parseLang(v as string | undefined)).toBe(out);
  });
  it("English is left-to-right, Arabic right-to-left, and the other language is the opposite", () => {
    expect(dirOf("en")).toBe("ltr");
    expect(dirOf("ar")).toBe("rtl");
    expect(otherLang("ar")).toBe("en");
    expect(otherLang("en")).toBe("ar");
  });
});

describe("localised", () => {
  it("gives the English text in English when it is written", () => {
    expect(localised("en", "عربي", "English")).toBe("English");
  });
  it("falls back to Arabic when the English is empty, blank or missing", () => {
    for (const en of ["", "   ", null, undefined]) expect(localised("en", "عربي", en)).toBe("عربي");
  });
  it("always gives the Arabic in Arabic, and an empty text when both are missing", () => {
    expect(localised("ar", "عربي", "English")).toBe("عربي");
    expect(localised("en", null, null)).toBe("");
    expect(localised("ar", undefined, "English")).toBe("");
  });
});

describe("messagesFor, getLang, getMessages", () => {
  it("gives the right words and never the admin words", () => {
    expect(messagesFor("ar").siteName).toBe("أصباغ الأرجوان");
    expect(messagesFor("en").siteName).toBe("Al-Erjiwan Paints");
    expect("admin" in messagesFor("ar")).toBe(false);
    expect("admin" in messagesFor("en")).toBe(false);
  });
  it("reads the language from the cookie, Arabic by default and when anything goes wrong", async () => {
    expect(await getLang()).toBe("ar");
    jar.value = "en";
    expect(await getLang()).toBe("en");
    expect((await getMessages()).common.currency).toBe("IQD");
    jar.value = "klingon";
    expect(await getLang()).toBe("ar");
    jar.throwing = true;
    expect(await getLang()).toBe("ar");
  });
});

describe("setLanguageAction", () => {
  it("remembers the language for a year, for the whole site", async () => {
    await setLanguageAction("en");
    expect(jar.set).toHaveBeenCalledWith(LANG_COOKIE, "en", { maxAge: LANG_MAX_AGE, path: "/", sameSite: "lax" });
    expect(LANG_MAX_AGE).toBe(31536000);
  });
  it("turns anything unknown into Arabic", async () => {
    await setLanguageAction("<script>");
    expect(jar.set).toHaveBeenCalledWith(LANG_COOKIE, "ar", expect.anything());
  });
});

describe("price and date in each language", () => {
  it("prices read د.ع by default and IQD in English", () => {
    expect(formatPrice(25000)).toBe("25,000 د.ع");
    expect(formatPrice(25000, "IQD")).toBe("25,000 IQD");
    expect(formatPrice(1234567.6, "IQD")).toBe("1,234,568 IQD");
  });
  it("dates use English words in English and Arabic words in Arabic, with ordinary digits", () => {
    const iso = "2026-11-20T22:30:00Z"; // the 21st in Baghdad
    const en = formatDate(iso, "en");
    const ar = formatDate(iso, "ar");
    expect(en).toMatch(/21/);
    expect(en).toMatch(/November/);
    expect(ar).toMatch(/21/);
    expect(ar).not.toMatch(/[A-Za-z]/);
    expect(ar).not.toMatch(/[٠-٩]/);
    expect(formatDateTime(iso, "en")).toMatch(/\d/);
    expect(formatDateTime(iso)).not.toMatch(/[A-Za-z]/);
  });
  it("bad dates stay safe", () => {
    expect(formatDate("nope", "en")).toBe("");
    expect(formatDateTime("nope", "en")).toBe("—");
    expect(localeOf("en")).toBe("en-GB");
  });
});
