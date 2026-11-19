import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";

// Dev-only copy of the admin tab bar (it needs no login here). Remove before launch.
export default function AdminNavHarness() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="flex-1 py-6">
      <AdminNav newOrders={3} />
    </main>
  );
}
