import { DashboardView } from "@/components/admin/DashboardView";
import { getDashboardStats } from "@/lib/admin/dashboard-data";
import { listOrders } from "@/lib/admin/orders-data";

export const dynamic = "force-dynamic";

// The layout already refreshes every admin page every 30 seconds, so these numbers stay current.
export default async function AdminDashboard() {
  const [stats, latest] = await Promise.all([getDashboardStats(), listOrders({ status: null, q: "", page: 1 })]);
  return <DashboardView stats={stats} latest={latest.orders.slice(0, 5)} />;
}
