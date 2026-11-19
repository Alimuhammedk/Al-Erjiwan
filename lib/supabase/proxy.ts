import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LOGIN = "/admin/login";

// Convenience only: real protection is requireAdmin() on each admin page.
export function shouldRedirectToLogin(pathname: string, hasUser: boolean): boolean {
  const onLogin = pathname === LOGIN || pathname.startsWith(`${LOGIN}/`);
  return !hasUser && !onLogin;
}

// Refreshes the login cookies on each admin request and reports whether a valid session exists.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { response, hasUser: false };

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    const { data } = await supabase.auth.getUser();
    return { response, hasUser: Boolean(data.user) };
  } catch {
    return { response, hasUser: false };
  }
}
