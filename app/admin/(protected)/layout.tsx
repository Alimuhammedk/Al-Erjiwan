import type { ReactNode } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdmin } from "@/lib/auth";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      {children}
    </>
  );
}
