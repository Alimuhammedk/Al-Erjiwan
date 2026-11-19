"use server";

import { redirect } from "next/navigation";
import { ar } from "@/content/ar";
import { createAuthClient } from "@/lib/supabase/auth-server";

export type LoginState = { error: string | null };

const MAX_LEN = 256;

export async function signInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password || email.length > MAX_LEN || password.length > MAX_LEN) {
    return { error: ar.admin.badCredentials };
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: ar.admin.badCredentials };

  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (rpcError || isAdmin !== true) {
    await supabase.auth.signOut();
    return { error: ar.admin.forbidden };
  }

  redirect("/admin"); // always /admin, never an address taken from the request
}

export async function signOutAction(): Promise<void> {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
