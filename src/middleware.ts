import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "agenda_auth";
const LOGIN_PATH = "/agenda/login";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard /agenda/* routes
  if (!pathname.startsWith("/agenda")) {
    return NextResponse.next();
  }

  // Allow the login page itself — no token needed
  if (pathname.startsWith(LOGIN_PATH)) {
    return NextResponse.next();
  }

  // Check for auth cookie set by AgendaAuthContext after login
  const authCookie = request.cookies.get(COOKIE_NAME);

  if (!authCookie?.value) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/agenda/:path*"],
};
