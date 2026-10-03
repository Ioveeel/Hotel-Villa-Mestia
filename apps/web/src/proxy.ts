import { NextResponse, type NextRequest } from "next/server";

// UX redirect only: checks that a session cookie exists, not that it's valid.
// The API is the real protection; admin pages also verify via /auth/me.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  const res =
    !isLogin && !request.cookies.has("sid")
      ? NextResponse.redirect(new URL("/admin/login", request.url))
      : NextResponse.next();

  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: "/admin/:path*",
};
