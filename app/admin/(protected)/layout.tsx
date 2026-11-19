import type { ReactNode } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { LiveRefresh } from "@/components/admin/LiveRefresh";
import { getNewOrderCount } from "@/lib/admin/orders-data";
import { requireAdmin } from "@/lib/auth";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  const newOrders = await getNewOrderCount();
  return (
    <>
      <AdminHeader email={user.email ?? ""} newOrders={newOrders} />
      <LiveRefresh newOrders={newOrders} />
      {children}
    </>
  );
}
