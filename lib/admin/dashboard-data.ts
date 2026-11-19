import { createAuthClient } from "@/lib/supabase/auth-server";
import { parseDashboardStats, type DashboardStats } from "./dashboard";

// The dashboard numbers from the database; null if they could not be loaded (the page says so instead of showing zeros).
export async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const db = await createAuthClient();
    const { data, error } = await db.rpc("dashboard_stats");
    return error ? null : parseDashboardStats(data);
  } catch {
    return null;
  }
}
