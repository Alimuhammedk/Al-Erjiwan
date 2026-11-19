"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Lang } from "./lang";
import type { Messages } from "./types";

type Value = { lang: Lang; t: Messages };
const LangContext = createContext<Value | null>(null);

// Filled once by the root layout, so every client component can read the words of the chosen language.
export function LangProvider({ lang, messages, children }: { lang: Lang; messages: Messages; children: ReactNode }) {
  return <LangContext.Provider value={{ lang, t: messages }}>{children}</LangContext.Provider>;
}

export function useLang(): Value {
  const value = useContext(LangContext);
  if (!value) throw new Error("useLang needs a LangProvider");
  return value;
}

export const useMessages = (): Messages => useLang().t;
