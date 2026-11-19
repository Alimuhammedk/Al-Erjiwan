"use client";

import { useState } from "react";
import { ar } from "@/content/ar";
import { copyText } from "@/lib/clipboard";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        setDone(await copyText(text));
        setTimeout(() => setDone(false), 2500);
      }}
      className="min-h-11 rounded-full border-2 border-brand-700 px-5 font-bold text-brand-700 hover:bg-brand-50"
    >
      {done ? ar.admin.orders.copied : label}
    </button>
  );
}
