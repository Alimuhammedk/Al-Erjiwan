import { NextResponse, type NextRequest } from "next/server";
import { shouldRedirectToLogin, updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, hasUser } = await updateSession(request);
  if (shouldRedirectToLogin(request.nextUrl.pathname, hasUser)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
