import { describe, expect, it } from "vitest";
import { messagesFor } from "../i18n/messages";

// Both languages must have exactly the same keys, and every {placeholder} must appear on both sides.
type Node = string | boolean | readonly Node[] | { readonly [k: string]: Node };

function walk(a: Node, b: Node, path: string, problems: string[]) {
  if (typeof a === "string" || typeof b === "string") {
    if (typeof a !== "string" || typeof b !== "string") return void problems.push(`${path}: not a text in both`);
    if (!a.trim()) problems.push(`${path}: Arabic is empty`);
    if (!b.trim()) problems.push(`${path}: English is empty`);
    const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    if (holes(a) !== holes(b)) problems.push(`${path}: placeholders differ (${holes(a)} vs ${holes(b)})`);
    return;
  }
  if (typeof a === "boolean" || typeof b === "boolean") {
    if (a !== b) problems.push(`${path}: flags differ`);
    return;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return void problems.push(`${path}: lists differ in length`);
    a.forEach((x, i) => walk(x, b[i], `${path}[${i}]`, problems));
    return;
  }
  const ka = Object.keys(a as object).sort();
  const kb = Object.keys(b as object).sort();
  for (const k of ka) if (!kb.includes(k)) problems.push(`${path}.${k}: missing in English`);
  for (const k of kb) if (!ka.includes(k)) problems.push(`${path}.${k}: missing in Arabic`);
  for (const k of ka) if (kb.includes(k)) walk((a as Record<string, Node>)[k], (b as Record<string, Node>)[k], `${path}.${k}`, problems);
}

describe("Arabic and English messages", () => {
  it("have the same keys, the same placeholders, and no empty words", () => {
    const problems: string[] = [];
    walk(messagesFor("ar") as unknown as Node, messagesFor("en") as unknown as Node, "messages", problems);
    expect(problems).toEqual([]);
  });

  it("English never contains Arabic letters, and Arabic never contains English words (the language switch and nav addresses excepted)", () => {
    // every text in a message set, skipping the language switch (it shows the other language on purpose) and nav addresses
    const texts = (v: unknown, key = ""): string[] => {
      if (key === "language" || key === "key" || key === "href") return [];
      if (typeof v === "string") return [v.replace(/{w+}/g, "")];
      if (Array.isArray(v)) return v.flatMap((x) => texts(x));
      if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => texts(x, k));
      return [];
    };
    const arabicInEnglish = texts(messagesFor("en")).filter((t) => /[؀-ۿ]/.test(t));
    const latinInArabic = texts(messagesFor("ar")).filter((t) => /[A-Za-z]{3,}/.test(t));
    expect(arabicInEnglish).toEqual([]);
    expect(latinInArabic).toEqual([]);
  });

  it("the shown language word is the other language, on both sides", () => {
    expect(messagesFor("ar").language.switchLabel).toBe("English");
    expect(messagesFor("en").language.switchLabel).toBe("عربي");
  });
});
