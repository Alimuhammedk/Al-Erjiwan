import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-server";

// Call at the top of every admin page. getUser() asks Supabase to validate the login;
// is_admin() (see supabase/migrations/0001_init.sql) checks the email is in the admins table.
// shortcut: signOut here can't clear cookies from a Server Component, so a non-admin keeps
// the cookie but is still refused every time; fine, upgrade if non-admin accounts ever exist.
export async function requireAdmin(): Promise<User> {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/admin/login");

  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (rpcError || isAdmin !== true) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }
  return data.user;
}
