"use client";

import { ar } from "@/content/ar";

// The delete button for a colour row. It says when ready-made sizes use the colour, then asks to confirm.
export function ColourDeleteButton({ action, sizes }: { action: () => Promise<void>; sizes: number }) {
  const t = ar.admin.colours;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const warning = sizes > 0 ? `${t.usedBy.replace("{n}", String(sizes))}\n` : "";
        if (!confirm(`${warning}${t.confirmDelete}`)) e.preventDefault();
      }}
    >
      <button type="submit" className="min-h-10 rounded-full border-2 border-coral-500 px-4 text-sm font-bold text-coral-500 hover:bg-coral-500/10">
        {ar.admin.delete}
      </button>
    </form>
  );
}
