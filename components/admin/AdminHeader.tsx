import { signOutAction } from "@/app/admin/login/actions";
import { ar } from "@/content/ar";
import { AdminNav } from "./AdminNav";

export function AdminHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-brand-100 bg-paper">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="text-lg font-extrabold text-brand-900">{ar.siteName}</span>
        <div className="flex items-center gap-3">
          <span dir="ltr" className="text-sm text-ink/70">{email}</span>
          <form action={signOutAction}>
            <button type="submit" className="rounded-full border-2 border-brand-700 px-4 py-1.5 text-sm font-bold text-brand-700 hover:bg-brand-50">
              {ar.admin.signOut}
            </button>
          </form>
        </div>
      </div>
      <AdminNav />
    </header>
  );
}
