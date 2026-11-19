"use client";

import { useEffect } from "react";

// Number boxes select what is in them when they get the focus, so typing replaces the old value (a 0 or a 1) instead of
// having to delete it first. Works for every numeric box on the site without touching each one.
export function SelectOnFocus() {
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement)) return;
      const numeric = el.type === "number" || el.inputMode === "numeric" || el.inputMode === "decimal";
      if (numeric && !el.readOnly && !el.disabled) setTimeout(() => el.select(), 0);
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);
  return null;
}
