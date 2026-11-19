"use client";

import { useState } from "react";
import { ar } from "@/content/ar";
import { copyText } from "@/lib/clipboard";

// One tap copies the order number, so the customer can paste it into the tracking page or a message.
export function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        setDone(await copyText(code));
        setTimeout(() => setDone(false), 2500);
      }}
      className="min-h-11 rounded-full border-2 border-brand-700 bg-paper px-6 font-bold text-brand-700 hover:bg-brand-50"
    >
      {done ? ar.order.copied : ar.order.copyNumber}
    </button>
  );
}
