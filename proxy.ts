import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-session";

// Guards everything under /admin and /mail (one session covers both). Each
// area's layout re-checks the session, so this is the fast path, not the only check.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const base = pathname === "/mail" || pathname.startsWith("/mail/") ? "/mail" : "/admin";
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const onLogin = pathname === `${base}/login`;

  let res: NextResponse;
  if (!user && !onLogin) {
    res = NextResponse.redirect(new URL(`${base}/login`, request.url));
  } else if (user && onLogin && request.method === "GET") {
    res = NextResponse.redirect(new URL(base, request.url));
  } else {
    res = NextResponse.next();
  }
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/mail", "/mail/:path*"],
};
