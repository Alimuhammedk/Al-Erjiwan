"use client";

import { ar } from "@/content/ar";

// `action` is a server action already bound to the row id, e.g. deleteCategoryAction.bind(null, id).
export function DeleteButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(ar.admin.confirmDelete)) e.preventDefault();
      }}
    >
      <button type="submit" className="rounded-full border-2 border-coral-500 px-4 py-1.5 text-sm font-bold text-coral-500 hover:bg-coral-500/10">
        {ar.admin.delete}
      </button>
    </form>
  );
}
